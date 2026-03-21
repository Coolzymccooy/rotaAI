import { prisma } from '../config/db.js';

export const getAllDoctors = async () => {
  return await prisma.doctor.findMany({
    include: { leaves: true },
  });
};

export const getDoctorById = async (id: string) => {
  return await prisma.doctor.findUnique({
    where: { id },
    include: { leaves: true, shifts: true },
  });
};

export const createDoctor = async (data: any) => {
  return await prisma.doctor.create({
    data,
  });
};

export const updateDoctor = async (id: string, data: any) => {
  return await prisma.doctor.update({
    where: { id },
    data,
  });
};

export const deleteDoctor = async (id: string) => {
  return await prisma.doctor.delete({
    where: { id },
  });
};
