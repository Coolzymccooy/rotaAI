import { prisma } from '../config/db.js';

export interface DoctorFilters {
  search?: string;
  grade?: string;
  department?: string;
  specialty?: string;
  site?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const getDoctors = async (filters: DoctorFilters = {}) => {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { doctorCode: { contains: filters.search } },
      { email: { contains: filters.search } },
    ];
  }
  if (filters.grade) where.grade = filters.grade;
  if (filters.department) where.department = filters.department;
  if (filters.specialty) where.specialty = filters.specialty;
  if (filters.site) where.site = filters.site;
  if (filters.status) where.status = filters.status;

  const [data, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.doctor.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// Get distinct values for filter dropdowns
export const getFilterOptions = async () => {
  const [grades, departments, specialties, sites] = await Promise.all([
    prisma.doctor.findMany({ select: { grade: true }, distinct: ['grade'], orderBy: { grade: 'asc' } }),
    prisma.doctor.findMany({ select: { department: true }, distinct: ['department'], orderBy: { department: 'asc' } }),
    prisma.doctor.findMany({ where: { specialty: { not: null } }, select: { specialty: true }, distinct: ['specialty'], orderBy: { specialty: 'asc' } }),
    prisma.doctor.findMany({ where: { site: { not: null } }, select: { site: true }, distinct: ['site'], orderBy: { site: 'asc' } }),
  ]);

  return {
    grades: grades.map(g => g.grade),
    departments: departments.map(d => d.department),
    specialties: specialties.map(s => s.specialty).filter(Boolean),
    sites: sites.map(s => s.site).filter(Boolean),
  };
};

export const getAllDoctors = async () => {
  return await prisma.doctor.findMany();
};

export const getDoctorById = async (id: string) => {
  return await prisma.doctor.findUnique({
    where: { id },
    include: { leaves: true, shifts: true, preferences: true, historicalLoad: true },
  });
};

export const createDoctor = async (data: any) => {
  return await prisma.doctor.create({ data });
};

export const updateDoctor = async (id: string, data: any) => {
  return await prisma.doctor.update({ where: { id }, data });
};

export const deleteDoctor = async (id: string) => {
  return await prisma.doctor.delete({ where: { id } });
};
