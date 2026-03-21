import { prisma } from '../config/db.js';

interface AuditEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
}

export const log = async (entry: AuditEntry) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error) {
    // Don't let audit log failures break the main flow
    console.error('Audit log error:', error);
  }
};

export const getAuditLogs = async (filters?: {
  entity?: string;
  action?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) => {
  const where: any = {};
  if (filters?.entity) where.entity = filters.entity;
  if (filters?.action) where.action = filters.action;
  if (filters?.userId) where.userId = filters.userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
};
