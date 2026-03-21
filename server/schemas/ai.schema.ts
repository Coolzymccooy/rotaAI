import { z } from 'zod';

export const aiCommandSchema = z.object({
  body: z.object({
    command: z.string().min(1, 'Command is required'),
    context: z.any().optional(),
  }),
});
