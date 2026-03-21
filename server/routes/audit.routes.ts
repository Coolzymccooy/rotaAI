import { Router } from 'express';
import * as auditController from '../controllers/audit.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', auditController.getAuditLogs);

export default router;
