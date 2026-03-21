import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createDoctorSchema, updateDoctorSchema } from '../schemas/doctor.schema.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect); // All doctor routes are protected

router.get('/filters', doctorController.getFilterOptions);

router.route('/')
  .get(doctorController.getDoctors)
  .post(validate(createDoctorSchema), doctorController.createDoctor);

router.route('/:id')
  .get(doctorController.getDoctor)
  .put(validate(updateDoctorSchema), doctorController.updateDoctor)
  .delete(doctorController.deleteDoctor);

export default router;
