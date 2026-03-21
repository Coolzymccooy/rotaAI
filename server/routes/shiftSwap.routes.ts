import { Router } from 'express';
import * as shiftSwapController from '../controllers/shiftSwap.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(shiftSwapController.getSwaps)
  .post(shiftSwapController.createSwap);

router.route('/:id/review')
  .put(authorize('admin'), shiftSwapController.reviewSwap);

export default router;
