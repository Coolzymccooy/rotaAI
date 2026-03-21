import { Router } from 'express';
import * as leaveRequestController from '../controllers/leaveRequest.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(leaveRequestController.getLeaveRequests)
  .post(leaveRequestController.createLeaveRequest);

router.route('/:id/review')
  .put(authorize('admin'), leaveRequestController.reviewLeaveRequest);

export default router;
