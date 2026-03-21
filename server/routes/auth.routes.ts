import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Public
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/invite/:token', authController.validateInvite);

// Protected
router.get('/me', protect, authController.getProfile);

// Admin only — invite management
router.post('/invites', protect, authorize('admin'), authController.createInvite);
router.get('/invites', protect, authorize('admin'), authController.getInvites);
router.delete('/invites/:id', protect, authorize('admin'), authController.revokeInvite);

export default router;
