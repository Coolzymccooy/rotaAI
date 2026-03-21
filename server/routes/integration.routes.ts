/**
 * Healthcare Integration API
 *
 * Endpoints for external hospital systems to push real-time data:
 * - HL7 FHIR R4 (Encounter, Location, Practitioner)
 * - HL7 v2.x ADT messages (pipe-delimited)
 * - REST webhooks (ward census, staff location, bed status)
 * - NEWS2 patient acuity scores
 *
 * All endpoints require X-API-Key header.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { emitAcuityAlert } from '../config/socket.js';
import { parseEncounter, parsePractitioner, FhirClient } from '../services/healthcare/fhir.service.js';
import { parseHl7Message, extractAdtEvent, validateAdtMessage } from '../services/healthcare/hl7v2.service.js';
import { calculateNews2, calculateWardAcuity, type News2Observations } from '../services/healthcare/news2.service.js';
import { checkNhsApiHealth } from '../services/healthcare/nhs.service.js';
import * as wardState from '../services/healthcare/wardState.service.js';

const router = Router();

// API Key auth for external systems
const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validKey = process.env.INTEGRATION_API_KEY;

  if (!validKey) {
    return res.status(503).json({
      success: false,
      message: 'Integration API not configured. Set INTEGRATION_API_KEY env var.',
    });
  }

  if (apiKey !== validKey) {
    return res.status(401).json({ success: false, message: 'Invalid API key' });
  }

  next();
};

router.use(validateApiKey);

// Log integration event to database
async function logEvent(data: {
  source: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  wardId?: string;
  doctorCode?: string;
  payload?: any;
  status?: string;
  errorMessage?: string;
}) {
  try {
    await prisma.integrationEvent.create({
      data: {
        ...data,
        payload: data.payload ? JSON.stringify(data.payload) : null,
      },
    });
  } catch (err) {
    logger.error('Failed to log integration event', { err });
  }
}

// ============================================
// FHIR R4 ENDPOINTS
// ============================================

/**
 * POST /api/integration/fhir/Encounter
 * Receive a FHIR Encounter resource (admission/discharge/transfer)
 */
router.post('/fhir/Encounter', async (req: Request, res: Response) => {
  try {
    const encounter = req.body;

    if (encounter.resourceType !== 'Encounter') {
      return res.status(400).json({ success: false, message: 'Expected Encounter resource' });
    }

    const parsed = parseEncounter(encounter);

    if (parsed.wardId) {
      const change = parsed.action === 'admit' ? 1 : parsed.action === 'discharge' ? -1 : 0;
      if (change !== 0) {
        await wardState.updatePatientCount(parsed.wardId, change, parsed.wardName || undefined);
      }

      // Handle transfers (discharge from old ward, admit to new)
      if (parsed.action === 'transfer' && encounter.location?.length > 1) {
        const oldLocation = encounter.location[0]?.location?.reference?.replace('Location/', '');
        if (oldLocation) {
          await wardState.updatePatientCount(oldLocation, -1);
        }
        await wardState.updatePatientCount(parsed.wardId, 1, parsed.wardName || undefined);
      }
    }

    await logEvent({
      source: 'fhir',
      eventType: `Encounter.${encounter.status}`,
      resourceType: 'Encounter',
      resourceId: encounter.id,
      wardId: parsed.wardId || undefined,
      payload: { action: parsed.action, patientId: parsed.patientId, priority: parsed.priority },
    });

    res.json({ success: true, data: { action: parsed.action, wardId: parsed.wardId } });
  } catch (error: any) {
    await logEvent({ source: 'fhir', eventType: 'Encounter.error', status: 'failed', errorMessage: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/integration/fhir/Bundle
 * Receive a FHIR Bundle (batch of resources)
 */
router.post('/fhir/Bundle', async (req: Request, res: Response) => {
  try {
    const bundle = req.body;
    if (bundle.resourceType !== 'Bundle') {
      return res.status(400).json({ success: false, message: 'Expected Bundle resource' });
    }

    const results = [];
    for (const entry of (bundle.entry || [])) {
      const resource = entry.resource;
      if (resource.resourceType === 'Encounter') {
        const parsed = parseEncounter(resource);
        if (parsed.wardId) {
          const change = parsed.action === 'admit' ? 1 : parsed.action === 'discharge' ? -1 : 0;
          if (change !== 0) {
            await wardState.updatePatientCount(parsed.wardId, change, parsed.wardName || undefined);
          }
        }
        results.push({ resourceType: 'Encounter', id: resource.id, action: parsed.action });
      }
    }

    await logEvent({
      source: 'fhir',
      eventType: 'Bundle',
      resourceType: 'Bundle',
      payload: { entryCount: bundle.entry?.length, processed: results.length },
    });

    res.json({ success: true, data: { processed: results.length, results } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// HL7 v2 ADT ENDPOINT
// ============================================

/**
 * POST /api/integration/hl7v2
 * Receive raw HL7v2 ADT messages (pipe-delimited format)
 * Content-Type: text/plain or application/hl7-v2
 *
 * Example:
 * MSH|^~\&|EPIC|MFT|ROTAAI|MFT|20260321150000||ADT^A01|MSG001|P|2.4
 * PID|||123456^^^MRN||Smith^John||19850315|M
 * PV1||I|AE^A&E Resus^BED01||||DOC00001^Smith^Sarah^^^Dr
 */
router.post('/hl7v2', async (req: Request, res: Response) => {
  try {
    // Accept both text/plain and JSON-wrapped HL7
    let rawMessage: string;
    if (typeof req.body === 'string') {
      rawMessage = req.body;
    } else if (req.body.message) {
      rawMessage = req.body.message;
    } else {
      return res.status(400).json({ success: false, message: 'Send raw HL7v2 message as text or { "message": "..." }' });
    }

    const validation = validateAdtMessage(rawMessage);
    if (!validation.valid) {
      await logEvent({ source: 'hl7v2', eventType: 'validation_error', status: 'failed', errorMessage: validation.error });
      return res.status(400).json({ success: false, message: validation.error });
    }

    const parsed = parseHl7Message(rawMessage);
    const adt = extractAdtEvent(parsed);

    // Update ward state based on ADT event
    if (adt.wardId) {
      switch (adt.action) {
        case 'admit':
          await wardState.updatePatientCount(adt.wardId, 1, adt.wardName || undefined);
          break;
        case 'discharge':
          await wardState.updatePatientCount(adt.wardId, -1, adt.wardName || undefined);
          break;
        case 'transfer':
          if (adt.previousWardId) {
            await wardState.updatePatientCount(adt.previousWardId, -1);
          }
          await wardState.updatePatientCount(adt.wardId, 1, adt.wardName || undefined);
          break;
      }
    }

    await logEvent({
      source: 'hl7v2',
      eventType: adt.messageType,
      wardId: adt.wardId || undefined,
      doctorCode: adt.attendingDoctorId || undefined,
      payload: {
        action: adt.action,
        patientId: adt.patientId,
        patientName: adt.patientName,
        wardId: adt.wardId,
        wardName: adt.wardName,
        bedId: adt.bedId,
      },
    });

    logger.info(`HL7v2 ${adt.messageType}: ${adt.action} patient ${adt.patientId} at ${adt.wardName || adt.wardId}`);

    res.json({ success: true, data: adt });
  } catch (error: any) {
    await logEvent({ source: 'hl7v2', eventType: 'parse_error', status: 'failed', errorMessage: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// REST WEBHOOK ENDPOINTS
// ============================================

/**
 * POST /api/integration/ward-census
 * Direct ward census update (from any EHR or bed management system)
 */
router.post('/ward-census', async (req: Request, res: Response) => {
  try {
    const { wardId, wardName, patients, capacity, staffPresent, acuityScore, pendingAdmissions, pendingDischarges } = req.body;

    if (!wardId) {
      return res.status(400).json({ success: false, message: 'wardId is required' });
    }

    const updated = await wardState.setWardCensus(wardId, {
      wardName,
      patients: patients !== undefined ? parseInt(patients) : undefined,
      capacity: capacity !== undefined ? parseInt(capacity) : undefined,
      staffPresent: staffPresent !== undefined ? parseInt(staffPresent) : undefined,
      acuityScore: acuityScore !== undefined ? parseFloat(acuityScore) : undefined,
      pendingAdmits: pendingAdmissions !== undefined ? parseInt(pendingAdmissions) : undefined,
      pendingDischarges: pendingDischarges !== undefined ? parseInt(pendingDischarges) : undefined,
    });

    await logEvent({ source: 'webhook', eventType: 'ward-census', wardId, payload: req.body });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/integration/staff-location
 * Staff check-in/check-out from badge readers
 */
router.post('/staff-location', async (req: Request, res: Response) => {
  try {
    const { doctorId, wardId, action } = req.body;

    if (!doctorId || !wardId || !action) {
      return res.status(400).json({ success: false, message: 'doctorId, wardId, and action required' });
    }

    const change = action === 'check-in' ? 1 : action === 'check-out' ? -1 : 0;
    if (change !== 0) {
      await wardState.updateStaffCount(wardId, change);
    }

    await logEvent({ source: 'badge-reader', eventType: `staff-${action}`, wardId, doctorCode: doctorId, payload: req.body });

    res.json({ success: true, data: { doctorId, wardId, action } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/integration/news2
 * Receive NEWS2 observations for a patient to update ward acuity
 */
router.post('/news2', async (req: Request, res: Response) => {
  try {
    const { wardId, patientId, observations } = req.body;

    if (!wardId || !observations) {
      return res.status(400).json({ success: false, message: 'wardId and observations required' });
    }

    const result = calculateNews2(observations as News2Observations);

    await logEvent({
      source: 'clinical',
      eventType: 'news2',
      wardId,
      payload: { patientId, score: result.totalScore, riskLevel: result.riskLevel },
    });

    // Update ward acuity score
    await wardState.setWardCensus(wardId, { acuityScore: result.totalScore });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// STATUS & MANAGEMENT
// ============================================

/**
 * GET /api/integration/live-data
 * Current state of all wards (from database)
 */
router.get('/live-data', async (_req: Request, res: Response) => {
  try {
    const wards = await wardState.getAllWards();
    res.json({ success: true, data: wards, count: wards.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/integration/events
 * Query integration event log
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const source = req.query.source as string;

    const where: any = {};
    if (source) where.source = source;

    const events = await prisma.integrationEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/integration/health
 * Health check + connection status for all external services
 */
router.get('/health', async (_req: Request, res: Response) => {
  const nhsHealth = await checkNhsApiHealth();

  const recentEvents = await prisma.integrationEvent.count({
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  const wardCount = await prisma.wardState.count();

  res.json({
    success: true,
    service: 'rotaai-integration',
    timestamp: new Date().toISOString(),
    stats: {
      wardsTracked: wardCount,
      eventsLast24h: recentEvents,
    },
    connections: {
      nhsApi: nhsHealth,
      fhirEndpoint: { configured: !!process.env.FHIR_SERVER_URL, url: process.env.FHIR_SERVER_URL || null },
    },
    endpoints: {
      fhir: [
        'POST /api/integration/fhir/Encounter',
        'POST /api/integration/fhir/Bundle',
      ],
      hl7v2: [
        'POST /api/integration/hl7v2 (text/plain or JSON)',
      ],
      webhooks: [
        'POST /api/integration/ward-census',
        'POST /api/integration/staff-location',
        'POST /api/integration/news2',
      ],
      query: [
        'GET /api/integration/live-data',
        'GET /api/integration/events',
        'GET /api/integration/health',
      ],
    },
  });
});

export default router;
