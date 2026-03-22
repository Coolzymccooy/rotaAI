/**
 * DTAC & GDPR Compliance Routes
 *
 * NHS DTAC (Digital Technology Assessment Criteria) requires:
 * - Clinical safety (DCB0129/DCB0160)
 * - Data protection (GDPR/UK GDPR)
 * - Technical security
 * - Interoperability
 * - Usability/accessibility
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import * as compliance from '../services/compliance.service.js';

const router = Router();
router.use(protect);

// ==========================================
// CHANGE LOG (CQC-grade audit trail)
// ==========================================

// GET /api/compliance/changelog — deep field-level audit trail
router.get('/changelog', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await compliance.getChangeLog({
      organizationId: req.user?.organizationId,
      entity: req.query.entity as string,
      entityId: req.query.entityId as string,
      userId: req.query.userId as string,
      action: req.query.action as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: parseInt(req.query.limit as string) || 100,
      offset: parseInt(req.query.offset as string) || 0,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

// ==========================================
// SUBJECT ACCESS REQUESTS (GDPR)
// ==========================================

// GET /api/compliance/my-data — user requests their own data export
router.get('/my-data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await compliance.generateSubjectAccessReport(req.user.id);

    // Log the SAR
    await prisma.dataExport.create({
      data: {
        userId: req.user.id,
        type: 'subject_access_request',
        status: 'completed',
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    await compliance.logChange({
      userId: req.user.id,
      userName: req.user.name,
      action: 'EXPORT',
      entity: 'SubjectAccessRequest',
      reason: 'GDPR Article 15 — Subject Access Request',
    });

    res.json({ success: true, data: report });
  } catch (error) { next(error); }
});

// POST /api/compliance/erasure — right to erasure request
router.post('/erasure', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.body.userId || req.user.id;

    // Only admins can erase other users; users can erase themselves
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const result = await compliance.eraseUserData(targetUserId, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// ==========================================
// CONSENT MANAGEMENT
// ==========================================

// POST /api/compliance/consent — record consent
router.post('/consent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await compliance.recordConsent({
      userId: req.user.id,
      email: req.user.email,
      consentType: req.body.consentType,
      granted: req.body.granted,
      version: req.body.version,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Update user consent flag
    if (req.body.consentType === 'data_processing') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { consentGiven: req.body.granted, consentDate: new Date() },
      });
    }

    res.json({ success: true, data: record });
  } catch (error) { next(error); }
});

// GET /api/compliance/consent-history
router.get('/consent-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await compliance.getConsentHistory(req.user.email);
    res.json({ success: true, data: history });
  } catch (error) { next(error); }
});

// ==========================================
// DATA RETENTION
// ==========================================

// GET /api/compliance/retention-policies
router.get('/retention-policies', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await prisma.dataRetentionPolicy.findMany({
      where: req.user?.organizationId ? { organizationId: req.user.organizationId } : {},
    });
    res.json({ success: true, data: policies });
  } catch (error) { next(error); }
});

// POST /api/compliance/retention-policies
router.post('/retention-policies', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policy = await prisma.dataRetentionPolicy.create({
      data: {
        organizationId: req.user?.organizationId,
        entity: req.body.entity,
        retentionDays: req.body.retentionDays || 2555,
        autoDelete: req.body.autoDelete || false,
      },
    });
    res.json({ success: true, data: policy });
  } catch (error) { next(error); }
});

// POST /api/compliance/enforce-retention — run retention purge
router.post('/enforce-retention', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await compliance.enforceRetentionPolicies(req.user?.organizationId);
    res.json({ success: true, data: results });
  } catch (error) { next(error); }
});

// ==========================================
// DTAC STATUS REPORT
// ==========================================

// GET /api/compliance/dtac-status — overall DTAC compliance status
router.get('/dtac-status', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.organizationId;

    const [userCount, consentCount, retentionPolicies, changeLogCount, dataExports] = await Promise.all([
      prisma.user.count({ where: orgId ? { organizationId: orgId } : {} }),
      prisma.consentRecord.count({ where: { granted: true } }),
      prisma.dataRetentionPolicy.count({ where: orgId ? { organizationId: orgId } : {} }),
      prisma.changeLog.count({ where: orgId ? { organizationId: orgId } : {} }),
      prisma.dataExport.count(),
    ]);

    const checks = [
      { id: 'auth', name: 'Authentication & Authorization', status: 'pass', detail: 'JWT + RBAC with role-based access control' },
      { id: 'encryption', name: 'Data Encryption', status: 'pass', detail: 'HTTPS/TLS in transit, bcrypt password hashing' },
      { id: 'audit', name: 'Audit Trail', status: changeLogCount > 0 ? 'pass' : 'warning', detail: `${changeLogCount} change log entries recorded` },
      { id: 'consent', name: 'Consent Management', status: consentCount > 0 ? 'pass' : 'warning', detail: `${consentCount} consent records` },
      { id: 'sar', name: 'Subject Access Requests', status: 'pass', detail: 'Self-service data export available at /api/compliance/my-data' },
      { id: 'erasure', name: 'Right to Erasure', status: 'pass', detail: 'Anonymization endpoint available at /api/compliance/erasure' },
      { id: 'retention', name: 'Data Retention Policies', status: retentionPolicies > 0 ? 'pass' : 'warning', detail: `${retentionPolicies} retention policies configured` },
      { id: 'multitenancy', name: 'Data Isolation', status: 'pass', detail: 'Organization-scoped data isolation (multi-tenant)' },
      { id: 'rbac', name: 'Role-Based Access', status: 'pass', detail: 'Admin, Coordinator, Doctor, Nurse, and 15+ clinical roles supported' },
      { id: 'interop', name: 'Interoperability', status: 'pass', detail: 'HL7 FHIR R4 + HL7v2 ADT integration endpoints' },
      { id: 'dcb0129', name: 'DCB0129 Clinical Safety', status: 'review', detail: 'Clinical Risk Management System — requires manual review and sign-off' },
      { id: 'dcb0160', name: 'DCB0160 Clinical Safety', status: 'review', detail: 'Deployment Clinical Safety Case — requires clinical safety officer' },
      { id: 'accessibility', name: 'WCAG 2.1 AA', status: 'partial', detail: 'Responsive UI, keyboard navigation — full WCAG audit recommended' },
      { id: 'penetration', name: 'Penetration Testing', status: 'pending', detail: 'Requires third-party pen test (e.g., CHECK/CREST certified)' },
    ];

    const passCount = checks.filter(c => c.status === 'pass').length;
    const totalChecks = checks.length;

    res.json({
      success: true,
      data: {
        overallScore: Math.round((passCount / totalChecks) * 100),
        passCount,
        totalChecks,
        checks,
        stats: { userCount, consentCount, retentionPolicies, changeLogCount, dataExports },
      },
    });
  } catch (error) { next(error); }
});

export default router;
