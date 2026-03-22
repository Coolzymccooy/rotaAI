import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import * as auditService from '../services/audit.service.js';

const router = Router();
router.use(protect);

// GET /api/rota-periods — list all periods for the org
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user?.organizationId) where.organizationId = req.user.organizationId;
    if (req.query.status) where.status = req.query.status;
    if (req.query.mode) where.mode = req.query.mode;

    const periods = await prisma.rotaPeriod.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });
    res.json({ success: true, data: periods });
  } catch (error) { next(error); }
});

// POST /api/rota-periods — create a new planning period
router.post('/', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, mode, startDate, endDate, notes, optimizationProfile } = req.body;

    const period = await prisma.rotaPeriod.create({
      data: {
        organizationId: req.user?.organizationId,
        name,
        mode,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes,
        optimizationProfile: optimizationProfile ? JSON.stringify(optimizationProfile) : null,
        createdBy: req.user?.id,
      },
    });

    await auditService.log({ userId: req.user?.id, action: 'CREATE', entity: 'RotaPeriod', entityId: period.id, details: { name, mode } });
    res.status(201).json({ success: true, data: period });
  } catch (error) { next(error); }
});

// PATCH /api/rota-periods/:id/publish
router.patch('/:id/publish', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = await prisma.rotaPeriod.update({
      where: { id: req.params.id },
      data: { status: 'published', publishedAt: new Date(), publishedBy: req.user?.id },
    });
    await auditService.log({ userId: req.user?.id, action: 'PUBLISH', entity: 'RotaPeriod', entityId: period.id });
    res.json({ success: true, data: period });
  } catch (error) { next(error); }
});

// PATCH /api/rota-periods/:id/lock
router.patch('/:id/lock', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = await prisma.rotaPeriod.update({
      where: { id: req.params.id },
      data: { status: 'locked', lockedAt: new Date() },
    });
    await auditService.log({ userId: req.user?.id, action: 'LOCK', entity: 'RotaPeriod', entityId: period.id });
    res.json({ success: true, data: period });
  } catch (error) { next(error); }
});

// PATCH /api/rota-periods/:id/unlock
router.patch('/:id/unlock', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = await prisma.rotaPeriod.update({
      where: { id: req.params.id },
      data: { status: 'draft', lockedAt: null },
    });
    res.json({ success: true, data: period });
  } catch (error) { next(error); }
});

// DELETE /api/rota-periods/:id
router.delete('/:id', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.rotaPeriod.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Period deleted' });
  } catch (error) { next(error); }
});

export default router;
