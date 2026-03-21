import { Request, Response, NextFunction } from 'express';
import * as shiftService from '../services/shift.service.js';

export const getShifts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shifts = await shiftService.getAllShifts();
    res.status(200).json({ success: true, data: shifts });
  } catch (error) {
    next(error);
  }
};

export const getShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shift = await shiftService.getShiftById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.status(200).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const createShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shift = await shiftService.createShift(req.body);
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shift = await shiftService.updateShift(req.params.id, req.body);
    res.status(200).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await shiftService.deleteShift(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
