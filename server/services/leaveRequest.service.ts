import { prisma } from '../config/db.js';

export const getAllLeaveRequests = async (filters?: { doctorId?: string; status?: string }) => {
  const where: any = {};
  if (filters?.doctorId) where.doctorId = filters.doctorId;
  if (filters?.status) where.status = filters.status;

  return prisma.leaveRequest.findMany({
    where,
    include: { doctor: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const getLeaveRequestById = async (id: string) => {
  return prisma.leaveRequest.findUnique({
    where: { id },
    include: { doctor: true },
  });
};

export const createLeaveRequest = async (data: {
  doctorId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) => {
  return prisma.leaveRequest.create({
    data: {
      doctorId: data.doctorId,
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
    },
    include: { doctor: true },
  });
};

export const reviewLeaveRequest = async (
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string
) => {
  const request = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status,
      reviewedBy,
      reviewedAt: new Date(),
    },
    include: { doctor: true },
  });

  // If approved, also create a Leave record
  if (status === 'approved') {
    await prisma.leave.create({
      data: {
        doctorId: request.doctorId,
        type: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
      },
    });
  }

  return request;
};
