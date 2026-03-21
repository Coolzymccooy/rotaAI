import { prisma } from '../config/db.js';

export const getAllSwaps = async (filters?: { requesterId?: string; status?: string }) => {
  const where: any = {};
  if (filters?.requesterId) where.requesterId = filters.requesterId;
  if (filters?.status) where.status = filters.status;

  return prisma.shiftSwap.findMany({
    where,
    include: {
      shift: true,
      requester: true,
      targetDoctor: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createSwap = async (data: {
  shiftId: string;
  requesterId: string;
  targetDoctorId: string;
  targetDayIdx: number;
  reason?: string;
}) => {
  return prisma.shiftSwap.create({
    data,
    include: {
      shift: true,
      requester: true,
      targetDoctor: true,
    },
  });
};

export const reviewSwap = async (
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string
) => {
  const swap = await prisma.shiftSwap.update({
    where: { id },
    data: {
      status,
      reviewedBy,
      reviewedAt: new Date(),
    },
    include: { shift: true, requester: true, targetDoctor: true },
  });

  // If approved, perform the actual swap
  if (status === 'approved') {
    await prisma.shift.update({
      where: { id: swap.shiftId },
      data: { doctorId: swap.targetDoctorId },
    });
  }

  return swap;
};
