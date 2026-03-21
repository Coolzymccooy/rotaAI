import { z } from 'zod';

export const generateRotaSchema = z.object({
  body: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    prompt: z.string().optional(),
    rules: z.object({
      maxWeeklyHours: z.number().optional(),
      minRestHours: z.number().optional(),
      maxConsecutiveNights: z.number().optional(),
    }).optional(),
  }),
});

export const updateRotaSchema = z.object({
  body: z.object({
    assignments: z.array(z.object({
      doctorId: z.string().uuid(),
      shiftId: z.string().uuid(),
      date: z.string().datetime(),
    })),
  }),
});
