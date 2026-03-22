import { Router } from 'express';
import authRoutes from './auth.routes.js';
import doctorRoutes from './doctor.routes.js';
import rotaRoutes from './rota.routes.js';
import aiRoutes from './ai.routes.js';
import shiftRoutes from './shift.routes.js';
import ruleRoutes from './rule.routes.js';
import leaveRequestRoutes from './leaveRequest.routes.js';
import shiftSwapRoutes from './shiftSwap.routes.js';
import auditRoutes from './audit.routes.js';
import searchRoutes from './search.routes.js';
import wardRoutes from './ward.routes.js';
import importRoutes from './import.routes.js';
import integrationRoutes from './integration.routes.js';
import rotaPeriodRoutes from './rotaPeriod.routes.js';
import selfServiceRoutes from './selfService.routes.js';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// External integration API (API-key auth, not JWT)
router.use('/integration', integrationRoutes);

// Protected routes
router.use('/doctors', doctorRoutes);
router.use('/rota', rotaRoutes);
router.use('/ai', aiRoutes);
router.use('/shifts', shiftRoutes);
router.use('/rules', ruleRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/shift-swaps', shiftSwapRoutes);
router.use('/audit', auditRoutes);
router.use('/search', searchRoutes);
router.use('/wards', wardRoutes);
router.use('/import', importRoutes);
router.use('/rota-periods', rotaPeriodRoutes);
router.use('/self-service', selfServiceRoutes);

export default router;
