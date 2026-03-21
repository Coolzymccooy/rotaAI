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
      details: { name: result.user.name, role: result.user.role, organizationId: result.user.organizationId },
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

// Invite management (admin only)
export const createInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user.organizationId) {
      return res.status(400).json({ success: false, message: 'You must belong to an organization' });
    }
    const { email, role } = req.body;
    const invite = await authService.createInvite(req.user.organizationId, email, role || 'doctor', req.user.id);

    const inviteUrl = `${req.protocol}://${req.get('host')}/register?invite=${invite.token}`;

    await auditService.log({
      userId: req.user.id,
      action: 'INVITE',
      entity: 'User',
      details: { email, role, inviteUrl },
    });

    res.status(201).json({ success: true, data: { ...invite, inviteUrl } });
  } catch (error) {
    next(error);
  }
};

export const getInvites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user.organizationId) {
      return res.json({ success: true, data: [] });
    }
    const invites = await authService.getInvites(req.user.organizationId);
    res.json({ success: true, data: invites });
  } catch (error) {
    next(error);
  }
};

export const revokeInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user.organizationId) {
      return res.status(400).json({ success: false, message: 'No organization' });
    }
    await authService.revokeInvite(req.params.id, req.user.organizationId);
    res.json({ success: true, message: 'Invite revoked' });
  } catch (error) {
    next(error);
  }
};

// Validate invite token (public)
export const validateInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const invite = await (await import('../config/db.js')).prisma.invite.findUnique({
      where: { token },
      include: { organization: { select: { name: true, slug: true } } },
    });

    if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invite' });
    }

    res.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        organizationName: invite.organization.name,
      },
    });
  } catch (error) {
    next(error);
  }
};
