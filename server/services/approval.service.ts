/**
 * Approval & Notification Service
 *
 * Handles:
 * - Multi-level approval chains
 * - Auto-approval rules
 * - Locum/agency budget approval
 * - In-app notifications
 * - Request lifecycle management
 */

import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

// ==========================================
// APPROVAL CHAIN LOGIC
// ==========================================

interface ApprovalDecision {
  autoApproved: boolean;
  requiredLevel: number;
  approverRole: string;
  reason: string;
}

export async function evaluateApproval(
  organizationId: string | null,
  requestType: string,
  context: Record<string, any>
): Promise<ApprovalDecision> {
  // Fetch approval rules for this request type
  const rules = await prisma.approvalRule.findMany({
    where: {
      organizationId: organizationId || undefined,
      requestType,
      isActive: true,
    },
    orderBy: { approvalLevel: 'asc' },
  });

  // If no rules configured, default behavior
  if (rules.length === 0) {
    return getDefaultApproval(requestType, context);
  }

  // Evaluate each rule
  for (const rule of rules) {
    const condition = JSON.parse(rule.condition || '{}');

    if (matchesCondition(condition, context)) {
      if (rule.approverRole === 'auto') {
        return {
          autoApproved: true,
          requiredLevel: 0,
          approverRole: 'auto',
          reason: rule.description || `Auto-approved: matches rule ${rule.id}`,
        };
      }

      return {
        autoApproved: false,
        requiredLevel: rule.approvalLevel,
        approverRole: rule.approverRole,
        reason: rule.description || `Requires ${rule.approverRole} approval`,
      };
    }
  }

  // No matching rule — require admin approval
  return {
    autoApproved: false,
    requiredLevel: 1,
    approverRole: 'admin',
    reason: 'Default: requires admin approval',
  };
}

function getDefaultApproval(requestType: string, context: Record<string, any>): ApprovalDecision {
  switch (requestType) {
    case 'leave':
      const days = context.durationDays || 0;
      if (days <= 1 && context.subType === 'sick') {
        return { autoApproved: true, requiredLevel: 0, approverRole: 'auto', reason: 'Single-day sick leave auto-approved' };
      }
      if (days <= 2 && context.subType !== 'annual') {
        return { autoApproved: true, requiredLevel: 0, approverRole: 'auto', reason: 'Short non-annual leave auto-approved' };
      }
      if (days <= 5) {
        return { autoApproved: false, requiredLevel: 1, approverRole: 'admin', reason: 'Leave up to 5 days: admin approval' };
      }
      return { autoApproved: false, requiredLevel: 2, approverRole: 'department_lead', reason: 'Leave over 5 days: department lead approval' };

    case 'swap':
      return { autoApproved: false, requiredLevel: 1, approverRole: 'admin', reason: 'Shift swaps require compliance check' };

    case 'locum':
      const cost = context.estimatedCost || 0;
      if (cost <= 500) {
        return { autoApproved: false, requiredLevel: 1, approverRole: 'admin', reason: 'Low-cost locum: admin approval' };
      }
      if (cost <= 2000) {
        return { autoApproved: false, requiredLevel: 2, approverRole: 'department_lead', reason: 'Locum £500-£2000: dept lead approval' };
      }
      return { autoApproved: false, requiredLevel: 3, approverRole: 'finance', reason: 'Locum over £2000: finance approval required' };

    case 'rota_override':
      return { autoApproved: false, requiredLevel: 2, approverRole: 'admin', reason: 'Published rota changes require admin approval' };

    default:
      return { autoApproved: false, requiredLevel: 1, approverRole: 'admin', reason: 'Default: admin approval required' };
  }
}

function matchesCondition(condition: Record<string, any>, context: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(condition)) {
    if (key === 'maxDays' && context.durationDays > value) return false;
    if (key === 'minDays' && context.durationDays < value) return false;
    if (key === 'maxCost' && context.estimatedCost > value) return false;
    if (key === 'subType' && context.subType !== value) return false;
    if (key === 'urgency' && context.urgency !== value) return false;
  }
  return true;
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    return await prisma.notification.create({ data });
  } catch (err) {
    logger.error('Failed to create notification', { err });
    return null;
  }
}

export async function notifyUser(userId: string, type: string, title: string, message: string, link?: string) {
  return createNotification({ userId, type, title, message, link });
}

// Notify all admins in an organization
export async function notifyAdmins(organizationId: string, type: string, title: string, message: string, link?: string) {
  const admins = await prisma.user.findMany({
    where: { organizationId, role: 'admin', isActive: true },
    select: { id: true },
  });

  const notifications = [];
  for (const admin of admins) {
    const n = await createNotification({ userId: admin.id, type, title, message, link });
    if (n) notifications.push(n);
  }
  return notifications;
}

export async function getNotifications(userId: string, unreadOnly = false) {
  const where: any = { userId };
  if (unreadOnly) where.isRead = false;

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// ==========================================
// LOCUM REQUEST LIFECYCLE
// ==========================================

export async function createLocumRequest(data: {
  organizationId?: string;
  department: string;
  grade: string;
  shiftType: string;
  shiftDate: string;
  shiftTime: string;
  reason: string;
  hourlyRate?: number;
  hours?: number;
  urgency?: string;
  requestedBy?: string;
  shiftId?: string;
}) {
  const hours = data.hours || 12;
  const rate = data.hourlyRate || 80;
  const estimatedCost = hours * rate;

  // Evaluate approval chain
  const decision = await evaluateApproval(data.organizationId || null, 'locum', {
    estimatedCost,
    urgency: data.urgency,
  });

  const request = await prisma.locumRequest.create({
    data: {
      organizationId: data.organizationId,
      shiftId: data.shiftId,
      department: data.department,
      grade: data.grade,
      shiftType: data.shiftType,
      shiftDate: new Date(data.shiftDate),
      shiftTime: data.shiftTime,
      reason: data.reason,
      estimatedCost,
      hourlyRate: rate,
      hours,
      urgency: data.urgency || 'normal',
      status: decision.autoApproved ? 'approved' : 'pending',
      requestedBy: data.requestedBy,
    },
  });

  // Notify admins
  if (data.organizationId) {
    await notifyAdmins(
      data.organizationId,
      'locum_needed',
      `Locum Required: ${data.department}`,
      `${data.grade} needed for ${data.shiftType} on ${new Date(data.shiftDate).toLocaleDateString()} (est. £${estimatedCost}). Reason: ${data.reason}`,
      '/app/requests'
    );
  }

  return { request, decision };
}

export async function reviewLocumRequest(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  rejectionReason?: string
) {
  const request = await prisma.locumRequest.update({
    where: { id },
    data: {
      status,
      approvedBy: status === 'approved' ? reviewedBy : null,
      approvedAt: status === 'approved' ? new Date() : null,
      rejectionReason: status === 'rejected' ? rejectionReason : null,
    },
  });

  return request;
}

export async function getLocumRequests(organizationId?: string, filters?: { status?: string; department?: string }) {
  const where: any = {};
  if (organizationId) where.organizationId = organizationId;
  if (filters?.status) where.status = filters.status;
  if (filters?.department) where.department = filters.department;

  return prisma.locumRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}
