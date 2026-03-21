import { Request, Response, NextFunction } from 'express';
import * as doctorService from '../services/doctor.service.js';
import * as auditService from '../services/audit.service.js';

export const getDoctors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: doctorService.DoctorFilters = {
      search: req.query.search as string,
      grade: req.query.grade as string,
      department: req.query.department as string,
      specialty: req.query.specialty as string,
      site: req.query.site as string,
      status: req.query.status as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      organizationId: req.user?.organizationId,
    };

    if (!req.query.page && !req.query.limit && !req.query.search && !req.query.grade && !req.query.department) {
      const doctors = await doctorService.getAllDoctors(req.user?.organizationId);
      return res.status(200).json({ success: true, data: doctors });
    }

    const result = await doctorService.getDoctors(filters);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getFilterOptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = await doctorService.getFilterOptions(req.user?.organizationId);
    res.status(200).json({ success: true, data: options });
  } catch (error) {
    next(error);
  }
};

export const getDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    // Tenant check
    if (req.user?.organizationId && doctor.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const createDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await doctorService.createDoctor({
      ...req.body,
      organizationId: req.user?.organizationId,
    });
    await auditService.log({
      userId: req.user?.id, action: 'CREATE', entity: 'Doctor',
      entityId: doctor.id, details: { name: doctor.name, grade: doctor.grade },
    });
    res.status(201).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const updateDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctor = await doctorService.updateDoctor(req.params.id, req.body);
    await auditService.log({
      userId: req.user?.id, action: 'UPDATE', entity: 'Doctor',
      entityId: doctor.id, details: req.body,
    });
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const deleteDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await doctorService.deleteDoctor(req.params.id);
    await auditService.log({
      userId: req.user?.id, action: 'DELETE', entity: 'Doctor', entityId: req.params.id,
    });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
