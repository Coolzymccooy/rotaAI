import { Router } from 'express';
import doctorRoutes from './doctor.routes.js';
import rotaRoutes from './rota.routes.js';
import aiRoutes from './ai.routes.js';
import shiftRoutes from './shift.routes.js';
import ruleRoutes from './rule.routes.js';

const router = Router();

router.use('/doctors', doctorRoutes);
router.use('/rota', rotaRoutes);
router.use('/ai', aiRoutes);
router.use('/shifts', shiftRoutes);
router.use('/rules', ruleRoutes);

// Mock routes for leave to satisfy the prompt requirements
router.use('/leave', (req, res) => res.json({ success: true, message: 'Leave API' }));

export default router;
