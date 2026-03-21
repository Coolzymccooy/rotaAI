import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { emitAcuityAlert } from '../config/socket.js';

const router = Router();

/**
 * INTEGRATION API
 *
 * These endpoints are designed for external systems (EHR, PAS, bed management)
 * to push real-time data into RotaAI. They use API key auth instead of JWT
 * so automated systems can call them without user sessions.
 *
 * External systems that can integrate:
 * - Epic (EHR) — patient census, admissions, discharges
 * - Cerner / Oracle Health — same
 * - CareFlow / Medway PAS — patient flow data
 * - TeleTracking / BedView — bed occupancy
 * - Hospital IoT — badge readers for staff location
 * - NHS Spine — staff registration validation
 */

// API Key middleware for external integrations
const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validKey = process.env.INTEGRATION_API_KEY;

  if (!validKey) {
    // If no key configured, reject all integration calls
    return res.status(503).json({
      success: false,
      message: 'Integration API not configured. Set INTEGRATION_API_KEY env var.'
    });
  }

  if (apiKey !== validKey) {
    return res.status(401).json({ success: false, message: 'Invalid API key' });
  }

  next();
};

router.use(validateApiKey);

// In-memory ward state (shared with ward.routes.ts via module-level state)
// In production, this would be in Redis or a database table
let liveWardData: Map<string, any> = new Map();

/**
 * POST /api/integration/ward-census
 *
 * Push real-time patient census for a ward.
 * Called by EHR/PAS systems whenever patient count changes.
 *
 * Body: {
 *   wardId: "ae-resus",
 *   wardName: "A&E Resus",
 *   site: "MFT Oxford Road",
 *   patients: 45,
 *   capacity: 40,
 *   acuityLevel: "critical" | "high" | "medium" | "low",
 *   timestamp: "2026-03-21T15:00:00Z"
 * }
 */
router.post('/ward-census', (req: Request, res: Response) => {
  const { wardId, wardName, site, patients, capacity, acuityLevel, timestamp } = req.body;

  if (!wardId || patients === undefined) {
    return res.status(400).json({ success: false, message: 'wardId and patients are required' });
  }

  const existing = liveWardData.get(wardId) || {};
  const updated = {
    ...existing,
    id: wardId,
    name: wardName || existing.name || wardId,
    site: site || existing.site,
    patients: parseInt(patients),
    capacity: parseInt(capacity) || existing.capacity || 30,
    acuityLevel: acuityLevel || 'medium',
    lastUpdated: timestamp || new Date().toISOString(),
  };

  liveWardData.set(wardId, updated);

  // Auto-alert if critical
  if (updated.patients > updated.capacity) {
    emitAcuityAlert(wardId, {
      wardName: updated.name,
      patients: updated.patients,
      capacity: updated.capacity,
      message: `${updated.name} is over capacity: ${updated.patients}/${updated.capacity} patients`,
    });
    logger.warn(`Acuity alert: ${updated.name} over capacity`, updated);
  }

  res.json({ success: true, data: updated });
});

/**
 * POST /api/integration/staff-location
 *
 * Push staff location data (from badge readers or manual check-in).
 * Used to update real-time staffing levels on the acuity map.
 *
 * Body: {
 *   doctorId: "DOC00001",
 *   wardId: "ae-resus",
 *   action: "check-in" | "check-out",
 *   timestamp: "2026-03-21T08:00:00Z"
 * }
 */
router.post('/staff-location', (req: Request, res: Response) => {
  const { doctorId, wardId, action, timestamp } = req.body;

  if (!doctorId || !wardId || !action) {
    return res.status(400).json({ success: false, message: 'doctorId, wardId, and action are required' });
  }

  const ward = liveWardData.get(wardId);
  if (ward) {
    if (action === 'check-in') {
      ward.staff = (ward.staff || 0) + 1;
    } else if (action === 'check-out') {
      ward.staff = Math.max(0, (ward.staff || 0) - 1);
    }
    ward.lastStaffUpdate = timestamp || new Date().toISOString();
    liveWardData.set(wardId, ward);
  }

  logger.info(`Staff ${action}: ${doctorId} at ${wardId}`);
  res.json({ success: true, data: { doctorId, wardId, action } });
});

/**
 * POST /api/integration/bed-status
 *
 * Push bed occupancy data from bed management systems.
 *
 * Body: {
 *   wardId: "ward-a",
 *   totalBeds: 30,
 *   occupiedBeds: 28,
 *   pendingAdmissions: 3,
 *   pendingDischarges: 1
 * }
 */
router.post('/bed-status', (req: Request, res: Response) => {
  const { wardId, totalBeds, occupiedBeds, pendingAdmissions, pendingDischarges } = req.body;

  if (!wardId) {
    return res.status(400).json({ success: false, message: 'wardId is required' });
  }

  const ward = liveWardData.get(wardId) || { id: wardId };
  ward.capacity = parseInt(totalBeds) || ward.capacity;
  ward.patients = parseInt(occupiedBeds) || ward.patients;
  ward.pendingAdmissions = parseInt(pendingAdmissions) || 0;
  ward.pendingDischarges = parseInt(pendingDischarges) || 0;
  ward.lastBedUpdate = new Date().toISOString();

  liveWardData.set(wardId, ward);

  res.json({ success: true, data: ward });
});

/**
 * GET /api/integration/live-data
 *
 * Read all live ward data (for debugging or dashboards).
 */
router.get('/live-data', (_req: Request, res: Response) => {
  const data = Array.from(liveWardData.values());
  res.json({ success: true, data, count: data.length });
});

/**
 * GET /api/integration/health
 *
 * Health check for monitoring.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'rotaai-integration',
    wardsTracked: liveWardData.size,
    timestamp: new Date().toISOString(),
  });
});

export default router;
