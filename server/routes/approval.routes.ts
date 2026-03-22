import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import * as approval from '../services/approval.service.js';
import * as auditService from '../services/audit.service.js';

const router = Router();
router.use(protect);

// ==========================================
// LOCUM REQUESTS
// ==========================================

// GET /api/approvals/locum — list locum requests
router.get('/locum', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await approval.getLocumRequests(
      req.user?.organizationId,
      { status: req.query.status as string, department: req.query.department as string }
    );
    res.json({ success: true, data: requests });
  } catch (error) { next(error); }
});

// POST /api/approvals/locum — create locum request
router.post('/locum', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await approval.createLocumRequest({
      ...req.body,
      organizationId: req.user?.organizationId,
      requestedBy: req.user?.id,
    });

    await auditService.log({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'LocumRequest',
      entityId: result.request.id,
      details: { department: req.body.department, grade: req.body.grade, estimatedCost: result.request.estimatedCost },
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

// PATCH /api/approvals/locum/:id/review — approve/reject locum request
router.patch('/locum/:id/review', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, rejectionReason } = req.body;
    const request = await approval.reviewLocumRequest(req.params.id, status, req.user?.id, rejectionReason);

    await auditService.log({
      userId: req.user?.id,
      action: 'REVIEW',
      entity: 'LocumRequest',
      entityId: request.id,
      details: { status, cost: request.estimatedCost },
    });

    res.json({ success: true, data: request });
  } catch (error) { next(error); }
});

// ==========================================
// APPROVAL RULES
// ==========================================

// GET /api/approvals/rules
router.get('/rules', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.approvalRule.findMany({
      where: req.user?.organizationId ? { organizationId: req.user.organizationId } : {},
      orderBy: [{ requestType: 'asc' }, { approvalLevel: 'asc' }],
    });
    res.json({ success: true, data: rules });
  } catch (error) { next(error); }
});

// POST /api/approvals/rules — create approval rule
router.post('/rules', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await prisma.approvalRule.create({
      data: {
        organizationId: req.user?.organizationId,
        requestType: req.body.requestType,
        condition: JSON.stringify(req.body.condition || {}),
        approvalLevel: req.body.approvalLevel || 1,
        approverRole: req.body.approverRole || 'admin',
        description: req.body.description,
      },
    });
    res.status(201).json({ success: true, data: rule });
  } catch (error) { next(error); }
});

// DELETE /api/approvals/rules/:id
router.delete('/rules/:id', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.approvalRule.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) { next(error); }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

// GET /api/approvals/notifications — my notifications
router.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await approval.getNotifications(req.user.id, req.query.unread === 'true');
    const unreadCount = await approval.getUnreadCount(req.user.id);
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) { next(error); }
});

// PATCH /api/approvals/notifications/:id/read
router.patch('/notifications/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await approval.markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// POST /api/approvals/notifications/read-all
router.post('/notifications/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await approval.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
