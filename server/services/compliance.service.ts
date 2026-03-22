/**
 * DTAC & GDPR Compliance Service
 *
 * Handles:
 * - Subject Access Requests (SAR) — GDPR Article 15
 * - Right to Erasure — GDPR Article 17
 * - Data Export — portable format
 * - Consent tracking
 * - Data retention policy enforcement
 * - Deep change logging (CQC-grade audit trail)
 */

import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

// ==========================================
// DEEP CHANGE LOG (CQC-grade audit)
// ==========================================

export async function logChange(data: {
  organizationId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}) {
  try {
    await prisma.changeLog.create({ data });
  } catch (err) {
    logger.error('Failed to write change log', { err });
  }
}

// Log multiple field changes at once (for UPDATE operations)
export async function logFieldChanges(
  context: {
    organizationId?: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    entity: string;
    entityId: string;
    reason?: string;
    ipAddress?: string;
  },
  before: Record<string, any>,
  after: Record<string, any>,
) {
  const changes: string[] = [];

  for (const key of Object.keys(after)) {
    const oldVal = before[key];
    const newVal = after[key];
    if (oldVal !== newVal && newVal !== undefined) {
      changes.push(key);
      await logChange({
        ...context,
        action: 'UPDATE',
        fieldName: key,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
      });
    }
  }

  return changes;
}

// ==========================================
// SUBJECT ACCESS REQUEST (GDPR Article 15)
// ==========================================

export async function generateSubjectAccessReport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctor: true, organization: { select: { name: true } } },
  });

  if (!user) throw new Error('User not found');

  // Gather all data about this person
  const [auditLogs, changeLogs, shifts, leaveRequests, availability, staffRequests] = await Promise.all([
    prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.changeLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
    user.doctorId ? prisma.shift.findMany({ where: { doctorId: user.doctorId } }) : [],
    user.doctorId ? prisma.leaveRequest.findMany({ where: { doctorId: user.doctorId } }) : [],
    user.doctorId ? prisma.availability.findMany({ where: { doctorId: user.doctorId } }) : [],
    user.doctorId ? prisma.staffRequest.findMany({ where: { doctorId: user.doctorId } }) : [],
  ]);

  return {
    exportDate: new Date().toISOString(),
    subject: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clinicalRole: user.clinicalRole,
      organization: user.organization?.name,
      createdAt: user.createdAt,
      consentGiven: user.consentGiven,
      consentDate: user.consentDate,
      lastLoginAt: user.lastLoginAt,
    },
    clinicalProfile: user.doctor ? {
      doctorCode: user.doctor.doctorCode,
      gmcNumber: user.doctor.gmcNumber,
      grade: user.doctor.grade,
      specialty: user.doctor.specialty,
      department: user.doctor.department,
      site: user.doctor.site,
      contractHours: user.doctor.contractHours,
      maxHours: user.doctor.maxHours,
      skills: user.doctor.skills,
    } : null,
    shifts: shifts.map(s => ({ dayIdx: s.dayIdx, type: s.type, time: s.time, date: s.date })),
    leaveRequests: leaveRequests.map(l => ({ type: l.type, startDate: l.startDate, endDate: l.endDate, status: l.status })),
    availability: availability.map(a => ({ type: a.type, startDate: a.startDate, endDate: a.endDate, reason: a.reason })),
    staffRequests: staffRequests.map(r => ({ type: r.type, title: r.title, status: r.status, createdAt: r.createdAt })),
    activityLog: auditLogs.map(l => ({ action: l.action, entity: l.entity, createdAt: l.createdAt })),
    changeHistory: changeLogs.map(c => ({ action: c.action, entity: c.entity, fieldName: c.fieldName, oldValue: c.oldValue, newValue: c.newValue, createdAt: c.createdAt })),
  };
}

// ==========================================
// RIGHT TO ERASURE (GDPR Article 17)
// ==========================================

export async function eraseUserData(userId: string, requestedBy: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Log the erasure before doing it
  await logChange({
    userId: requestedBy,
    action: 'ERASURE',
    entity: 'User',
    entityId: userId,
    reason: 'GDPR Right to Erasure request',
  });

  // Anonymize rather than delete (preserve audit trail integrity)
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `erased-${userId.slice(0, 8)}@deleted.rotaai.com`,
      name: 'Erased User',
      password: 'ERASED',
      isActive: false,
      deactivatedAt: new Date(),
    },
  });

  // Anonymize doctor record if linked
  if (user.doctorId) {
    await prisma.doctor.update({
      where: { id: user.doctorId },
      data: {
        name: 'Erased Staff Member',
        firstName: null,
        lastName: null,
        email: null,
        gmcNumber: null,
        status: 'Erased',
      },
    });
  }

  return { success: true, message: 'User data anonymized per GDPR Article 17' };
}

// ==========================================
// CONSENT MANAGEMENT
// ==========================================

export async function recordConsent(data: {
  userId?: string;
  email: string;
  consentType: string;
  granted: boolean;
  version?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.consentRecord.create({
    data: {
      userId: data.userId,
      email: data.email,
      consentType: data.consentType,
      granted: data.granted,
      version: data.version || '1.0',
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}

export async function getConsentHistory(email: string) {
  return prisma.consentRecord.findMany({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });
}

// ==========================================
// DATA RETENTION
// ==========================================

export async function enforceRetentionPolicies(organizationId?: string) {
  const policies = await prisma.dataRetentionPolicy.findMany({
    where: organizationId ? { organizationId } : {},
  });

  const results: Record<string, number> = {};

  for (const policy of policies) {
    if (!policy.autoDelete) continue;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    let deleted = 0;
    try {
      switch (policy.entity) {
        case 'AuditLog':
          const auditResult = await prisma.auditLog.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
          });
          deleted = auditResult.count;
          break;
        case 'IntegrationEvent':
          const intResult = await prisma.integrationEvent.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
          });
          deleted = intResult.count;
          break;
        case 'ChangeLog':
          const changeResult = await prisma.changeLog.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
          });
          deleted = changeResult.count;
          break;
      }

      if (deleted > 0) {
        await prisma.dataRetentionPolicy.update({
          where: { id: policy.id },
          data: { lastPurgedAt: new Date() },
        });
      }

      results[policy.entity] = deleted;
    } catch (err) {
      logger.error(`Retention purge failed for ${policy.entity}`, { err });
    }
  }

  return results;
}

// ==========================================
// QUERY CHANGE LOG
// ==========================================

export async function getChangeLog(filters: {
  organizationId?: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (filters.organizationId) where.organizationId = filters.organizationId;
  if (filters.entity) where.entity = filters.entity;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.changeLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    }),
    prisma.changeLog.count({ where }),
  ]);

  return { logs, total };
}
