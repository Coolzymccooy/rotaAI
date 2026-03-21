import { Router } from 'express';
import { getRules, updateRule, createRule } from '../controllers/rule.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getRules)
  .post(createRule);

router.route('/:id')
  .put(updateRule);

export default router;
