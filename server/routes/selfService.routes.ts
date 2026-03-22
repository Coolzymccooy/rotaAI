/**
 * Self-Service Routes
 *
 * Both doctors and admins can use these.
 * Doctors see only their own data; admins see all within the org.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import * as auditService from '../services/audit.service.js';
import * as approvalService from '../services/approval.service.js';

const router = Router();
router.use(protect);

// ==============================
// AVAILABILITY
// ==============================

// GET /api/self-service/availability — my availability blocks
router.get('/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user?.role === 'doctor' && req.user?.doctorId) {
      where.doctorId = req.user.doctorId;
    } else if (req.query.doctorId) {
      where.doctorId = req.query.doctorId;
    }

    const blocks = await prisma.availability.findMany({
      where,
      include: { doctor: { select: { name: true, grade: true } } },
      orderBy: { startDate: 'asc' },
    });
    res.json({ success: true, data: blocks });
  } catch (error) { next(error); }
});

// POST /api/self-service/availability — add an availability block
router.post('/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, startDate, endDate, reason, isRecurring, recurringDay } = req.body;
    const doctorId = req.user?.doctorId || req.body.doctorId;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'doctorId is required' });
    }

    const block = await prisma.availability.create({
      data: {
        doctorId,
        type: type || 'unavailable',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        isRecurring: isRecurring || false,
        recurringDay,
      },
    });

    res.status(201).json({ success: true, data: block });
  } catch (error) { next(error); }
});

// DELETE /api/self-service/availability/:id
router.delete('/availability/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.availability.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Removed' });
  } catch (error) { next(error); }
});

// ==============================
// STAFF REQUESTS (leave, swaps, preferences, restrictions)
// ==============================

// GET /api/self-service/requests — my requests or all (admin)
router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user?.organizationId) where.organizationId = req.user.organizationId;

    if (req.user?.role === 'doctor' && req.user?.doctorId) {
      where.doctorId = req.user.doctorId;
    }
    if (req.query.type) where.type = req.query.type;
    if (req.query.status) where.status = req.query.status;

    const requests = await prisma.staffRequest.findMany({
      where,
      include: { doctor: { select: { name: true, grade: true, department: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.query.limit as string) || 50,
    });
    res.json({ success: true, data: requests });
  } catch (error) { next(error); }
});

// POST /api/self-service/requests — submit a new request
router.post('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, subType, title, description, startDate, endDate, targetDoctorId, targetShiftId, priority } = req.body;
    const doctorId = req.user?.doctorId || req.body.doctorId;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'doctorId is required' });
    }

    // Evaluate approval chain
    const durationDays = (startDate && endDate)
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const decision = await approvalService.evaluateApproval(
      req.user?.organizationId || null,
      type,
      { durationDays, subType, urgency: priority }
    );

    const autoApprovable = decision.autoApproved;
    const status = decision.autoApproved ? 'approved' : 'pending';

    const request = await prisma.staffRequest.create({
      data: {
        organizationId: req.user?.organizationId,
        doctorId,
        type,
        subType,
        title,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        targetDoctorId,
        targetShiftId,
        priority: priority || 'normal',
        status,
        autoApprovable,
      },
      include: { doctor: { select: { name: true } } },
    });

    await auditService.log({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'StaffRequest',
      entityId: request.id,
      details: { type, subType, title },
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) { next(error); }
});

// PATCH /api/self-service/requests/:id/review — admin approve/reject
router.patch('/requests/:id/review', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const request = await prisma.staffRequest.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewedBy: req.user?.id,
        reviewedAt: new Date(),
        reviewNote,
      },
      include: { doctor: { select: { name: true } } },
    });

    // If approved leave request, create Leave record
    if (status === 'approved' && request.type === 'leave' && request.startDate && request.endDate) {
      await prisma.leave.create({
        data: {
          doctorId: request.doctorId,
          type: request.subType || 'annual',
          startDate: request.startDate,
          endDate: request.endDate,
        },
      });
    }

    await auditService.log({
      userId: req.user?.id,
      action: 'REVIEW',
      entity: 'StaffRequest',
      entityId: request.id,
      details: { status, reviewNote },
    });

    // Notify the requesting doctor
    const requestingUser = await prisma.user.findFirst({ where: { doctorId: request.doctorId } });
    if (requestingUser) {
      await approvalService.notifyUser(
        requestingUser.id,
        status === 'approved' ? 'request_approved' : 'request_rejected',
        `Request ${status}: ${request.title}`,
        status === 'approved'
          ? `Your ${request.type} request "${request.title}" has been approved.`
          : `Your ${request.type} request "${request.title}" was rejected.${reviewNote ? ` Reason: ${reviewNote}` : ''}`,
        '/app/portal'
      );
    }

    res.json({ success: true, data: request });
  } catch (error) { next(error); }
});

// DELETE /api/self-service/requests/:id — cancel own request
router.delete('/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await prisma.staffRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });

    // Doctors can only cancel their own pending requests
    if (req.user?.role === 'doctor' && request.doctorId !== req.user?.doctorId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only cancel pending requests' });
    }

    await prisma.staffRequest.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) { next(error); }
});

// ==============================
// MY PROFILE (doctor self-service)
// ==============================

// GET /api/self-service/my-shifts
router.get('/my-shifts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.doctorId) {
      return res.json({ success: true, data: [] });
    }

    const shifts = await prisma.shift.findMany({
      where: { doctorId: req.user.doctorId },
      orderBy: { dayIdx: 'asc' },
    });
    res.json({ success: true, data: shifts });
  } catch (error) { next(error); }
});

// GET /api/self-service/my-stats
router.get('/my-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.doctorId) {
      return res.json({ success: true, data: null });
    }

    const [shifts, load, prefs, pendingRequests] = await Promise.all([
      prisma.shift.count({ where: { doctorId: req.user.doctorId } }),
      prisma.historicalLoad.findUnique({ where: { doctorId: req.user.doctorId } }),
      prisma.doctorPreference.findUnique({ where: { doctorId: req.user.doctorId } }),
      prisma.staffRequest.count({ where: { doctorId: req.user.doctorId, status: 'pending' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalShifts: shifts,
        historicalLoad: load,
        preferences: prefs,
        pendingRequests,
      },
    });
  } catch (error) { next(error); }
});

// PUT /api/self-service/my-preferences — update own preferences
router.put('/my-preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.doctorId) {
      return res.status(400).json({ success: false, message: 'No doctor profile linked' });
    }

    const data = {
      preferredShift: req.body.preferredShift,
      unavailableDay: req.body.unavailableDay,
      trainingDay: req.body.trainingDay,
      priorityFocus: req.body.priorityFocus,
      notes: req.body.notes,
      fairnessWeight: req.body.fairnessWeight,
      preferenceWeight: req.body.preferenceWeight,
      continuityWeight: req.body.continuityWeight,
    };

    const pref = await prisma.doctorPreference.upsert({
      where: { doctorId: req.user.doctorId },
      update: data,
      create: { doctorId: req.user.doctorId, ...data },
    });

    res.json({ success: true, data: pref });
  } catch (error) { next(error); }
});

export default router;
