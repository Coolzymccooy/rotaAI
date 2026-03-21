import { Request, Response, NextFunction } from 'express';
import * as leaveRequestService from '../services/leaveRequest.service.js';
import * as auditService from '../services/audit.service.js';

export const getLeaveRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    if (req.query.doctorId) filters.doctorId = req.query.doctorId;
    if (req.query.status) filters.status = req.query.status;

    // Doctors can only see their own leave requests
    if (req.user.role === 'doctor' && req.user.doctorId) {
      filters.doctorId = req.user.doctorId;
    }

    const requests = await leaveRequestService.getAllLeaveRequests(filters);
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

export const createLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await leaveRequestService.createLeaveRequest(req.body);
    await auditService.log({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'LeaveRequest',
      entityId: request.id,
      details: req.body,
    });
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

export const reviewLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const request = await leaveRequestService.reviewLeaveRequest(
      req.params.id,
      status,
      req.user.id
    );
    await auditService.log({
      userId: req.user?.id,
      action: 'REVIEW',
      entity: 'LeaveRequest',
      entityId: request.id,
      details: { status },
    });
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};
