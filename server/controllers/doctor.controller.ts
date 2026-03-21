import { Request, Response, NextFunction } from 'express';
import * as doctorService from '../services/doctor.service.js';

export const getDoctors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctors = await doctorService.getAllDoctors();
    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
};

export const getDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const createDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await doctorService.createDoctor(req.body);
    res.status(201).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const updateDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await doctorService.updateDoctor(req.params.id, req.body);
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const deleteDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await doctorService.deleteDoctor(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
