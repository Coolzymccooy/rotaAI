import { Router } from 'express';
import * as shiftController from '../controllers/shift.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(shiftController.getShifts)
  .post(shiftController.createShift);

router.route('/:id')
  .get(shiftController.getShift)
  .put(shiftController.updateShift)
  .delete(shiftController.deleteShift);

export default router;
