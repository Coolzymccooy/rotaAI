import { Request, Response, NextFunction } from 'express';
import * as rotaService from '../services/rota.service.js';

export const generateRota = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, rules } = req.body;
    const result = await rotaService.generateRota(startDate, endDate, rules);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const updateRota = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignments } = req.body;
    const result = await rotaService.updateRota(assignments);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
