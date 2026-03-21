import { Request, Response, NextFunction } from 'express';
import * as ruleService from '../services/rule.service.js';

export const getRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await ruleService.getAllRules(req.user?.organizationId);
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

export const updateRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await ruleService.updateRule(req.params.id, req.body);
    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

export const createRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await ruleService.createRule({ ...req.body, organizationId: req.user?.organizationId });
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};
