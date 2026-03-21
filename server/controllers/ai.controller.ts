import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/ai.service.js';

export const processCommand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { command, context } = req.body;
    const result = await aiService.processCommand(command, context);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
