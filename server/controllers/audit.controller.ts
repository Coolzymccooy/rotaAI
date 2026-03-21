import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/audit.service.js';

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      entity: req.query.entity as string | undefined,
      action: req.query.action as string | undefined,
      userId: req.query.userId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await auditService.getAuditLogs(filters);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
