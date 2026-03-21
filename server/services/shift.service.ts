import { prisma } from '../config/db.js';

export const getAllShifts = async (organizationId?: string) => {
  const where: any = {};
  if (organizationId) where.organizationId = organizationId;
  return prisma.shift.findMany({ where, include: { doctor: true } });
};

export const getShiftById = async (id: string) => {
  return prisma.shift.findUnique({ where: { id }, include: { doctor: true } });
};

export const createShift = async (data: any) => {
  return prisma.shift.create({ data });
};

export const updateShift = async (id: string, data: any) => {
  return prisma.shift.update({ where: { id }, data });
};

export const deleteShift = async (id: string) => {
  return prisma.shift.delete({ where: { id } });
};
