import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import * as auditService from '../services/audit.service.js';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body);
    await auditService.log({
      userId: result.user.id,
      action: 'REGISTER',
      entity: 'User',
      entityId: result.user.id,
      details: { name: result.user.name, role: result.user.role },
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    await auditService.log({
      userId: result.user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: result.user.id,
      details: { email: result.user.email },
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
