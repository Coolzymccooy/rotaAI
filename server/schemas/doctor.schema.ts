import { z } from 'zod';

export const createDoctorSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    grade: z.string().min(1, 'Grade is required'),
    department: z.string().optional(),
    contract: z.string().min(1, 'Contract is required'),
    fte: z.string().optional(),
    status: z.string().optional(),
    karma: z.number().optional(),
    fatigue: z.string().optional(),
    maxHours: z.number().optional(),
  }),
});

export const updateDoctorSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid doctor ID'),
  }),
  body: z.object({
    name: z.string().optional(),
    grade: z.string().optional(),
    department: z.string().optional(),
    contract: z.string().optional(),
    fte: z.string().optional(),
    status: z.string().optional(),
    karma: z.number().optional(),
    fatigue: z.string().optional(),
    maxHours: z.number().optional(),
  }),
});
