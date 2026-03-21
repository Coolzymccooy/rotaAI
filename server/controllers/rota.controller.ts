import { Request, Response, NextFunction } from 'express';
import * as rotaService from '../services/rota.service.js';
import * as auditService from '../services/audit.service.js';

export const generateRota = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, rules } = req.body;
    const result = await rotaService.generateRota(startDate, endDate, rules, req.user?.organizationId);
    await auditService.log({
      userId: req.user?.id,
      action: 'GENERATE_ROTA',
      entity: 'Rota',
      details: {
        shiftsCreated: result.shifts?.length || 0,
        fairnessScore: result.fairnessScore,
        coverageScore: result.coverageScore,
      },
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const updateRota = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignments } = req.body;
    const result = await rotaService.updateRota(assignments);
    await auditService.log({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Rota',
      details: { shiftsUpdated: result.length },
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
