import { Request, Response, NextFunction } from 'express';
import * as shiftSwapService from '../services/shiftSwap.service.js';
import * as auditService from '../services/audit.service.js';

export const getSwaps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;

    if (req.user.role === 'doctor' && req.user.doctorId) {
      filters.requesterId = req.user.doctorId;
    }

    const swaps = await shiftSwapService.getAllSwaps(filters);
    res.status(200).json({ success: true, data: swaps });
  } catch (error) {
    next(error);
  }
};

export const createSwap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const swap = await shiftSwapService.createSwap(req.body);
    await auditService.log({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'ShiftSwap',
      entityId: swap.id,
      details: req.body,
    });
    res.status(201).json({ success: true, data: swap });
  } catch (error) {
    next(error);
  }
};

export const reviewSwap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const swap = await shiftSwapService.reviewSwap(req.params.id, status, req.user.id);
    await auditService.log({
      userId: req.user?.id,
      action: 'REVIEW',
      entity: 'ShiftSwap',
      entityId: swap.id,
      details: { status },
    });
    res.status(200).json({ success: true, data: swap });
  } catch (error) {
    next(error);
  }
};
