/**
 * Tenant Isolation Middleware
 *
 * Automatically injects organizationId into req so all
 * downstream queries are scoped to the user's organization.
 */

import { Request, Response, NextFunction } from 'express';

export const injectTenant = (req: Request, _res: Response, next: NextFunction) => {
  // After auth middleware runs, req.user has { id, role, organizationId, ... }
  if (req.user?.organizationId) {
    req.organizationId = req.user.organizationId;
  }
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}
