import { Router } from 'express';
import * as rotaController from '../controllers/rota.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { generateRotaSchema, updateRotaSchema } from '../schemas/rota.schema.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/generate', validate(generateRotaSchema), rotaController.generateRota);
router.put('/update', validate(updateRotaSchema), rotaController.updateRota);

export default router;
