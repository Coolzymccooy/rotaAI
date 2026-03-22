import { Request, Response, NextFunction } from 'express';
import * as rotaService from '../services/rota.service.js';
import * as auditService from '../services/audit.service.js';

// POST /api/rota/generate — full, partial, or repair generation
export const generateRota = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, rules, mode, department, grade, site, targetDoctorId, targetDayIdx } = req.body;

    const result = await rotaService.generateRota({
      startDate,
      endDate,
      rules,
      organizationId: req.user?.organizationId,
      mode: mode || 'full',
      department,
      grade,
      site,
      targetDoctorId,
      targetDayIdx,
    });

    await auditService.log({
      userId: req.user?.id,
      action: 'GENERATE_ROTA',
      entity: 'Rota',
      details: {
        mode: mode || 'full',
        shiftsCreated: result.shifts?.length || 0,
        totalShifts: result.totalShifts,
        fairnessScore: result.fairnessScore,
        coverageScore: result.coverageScore,
        filters: { department, grade, site },
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
