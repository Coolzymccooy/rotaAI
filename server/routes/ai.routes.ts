import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { aiCommandSchema } from '../schemas/ai.schema.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/command', validate(aiCommandSchema), aiController.processCommand);

export default router;
