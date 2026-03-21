import { prisma } from '../config/db.js';

export const getAllRules = async (organizationId?: string) => {
  const where: any = {};
  if (organizationId) where.organizationId = organizationId;
  return prisma.rule.findMany({ where });
};

export const updateRule = async (id: string, data: any) => {
  return prisma.rule.update({ where: { id }, data });
};

export const createRule = async (data: any) => {
  return prisma.rule.create({ data });
};
