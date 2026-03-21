import { prisma } from '../config/db.js';

export const getAllShifts = async () => {
  return await prisma.shift.findMany({
    include: { doctor: true },
  });
};

export const getShiftById = async (id: string) => {
  return await prisma.shift.findUnique({
    where: { id },
    include: { doctor: true },
  });
};

export const createShift = async (data: any) => {
  return await prisma.shift.create({
    data,
  });
};

export const updateShift = async (id: string, data: any) => {
  return await prisma.shift.update({
    where: { id },
    data,
  });
};

export const deleteShift = async (id: string) => {
  return await prisma.shift.delete({
    where: { id },
  });
};
