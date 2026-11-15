import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'Staff identifier is required' })
    .trim()
    .min(1, 'Staff email or identifier cannot be empty'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
