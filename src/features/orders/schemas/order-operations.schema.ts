import { z } from 'zod';

export const manufacturingEventTypes = [
  'MATERIAL_PREPARATION',
  'MANUFACTURING_STARTED',
  'MANUFACTURING_UPDATE',
  'QUALITY_CHECK_COMPLETED',
  'READY_FOR_DISPATCH',
  'DELIVERY_COORDINATION',
] as const;

export const customerUpdateCategories = [
  'PREDEFINED_UPDATE',
  'CUSTOM_MESSAGE',
  'MANUFACTURING_UPDATE',
  'DELAY_NOTIFICATION',
  'DELIVERY_COORDINATION',
] as const;

export const customerUpdateTemplates = [
  'MANUFACTURING_STARTED',
  'IN_PRODUCTION',
  'PRODUCTION_DELAY',
  'QUALITY_CHECK_PASSED',
  'DELIVERY_COORDINATION',
] as const;

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED']),
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
  verificationCode: z
    .string()
    .max(64, 'Verification code must not exceed 64 characters')
    .optional(),
});

export type UpdateOrderStatusFormData = z.infer<typeof updateOrderStatusSchema>;

export const recordManufacturingEventSchema = z.object({
  eventType: z.enum(manufacturingEventTypes),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
});

export type RecordManufacturingEventFormData = z.infer<typeof recordManufacturingEventSchema>;

export const createCustomerUpdateSchema = z
  .object({
    category: z.enum(customerUpdateCategories),
    templateKey: z.enum(customerUpdateTemplates).optional(),
    message: z.string().max(1000, 'Message must not exceed 1000 characters').optional(),
    notifyCustomer: z.boolean(),
  })
  .refine(
    (data) => {
      const hasTemplate = !!data.templateKey;
      const hasMessage = !!data.message && data.message.trim().length > 0;
      return hasTemplate || hasMessage;
    },
    {
      message: 'Either a predefined template or a custom message is required',
      path: ['message'],
    },
  );

export type CreateCustomerUpdateFormData = z.infer<typeof createCustomerUpdateSchema>;

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  internalNotes: z.string().max(1000, 'Internal notes must not exceed 1000 characters').optional(),
  requestApproval: z.boolean(),
});

export type CancelOrderFormData = z.infer<typeof cancelOrderSchema>;

export const approveCancellationSchema = z.object({
  resolutionNotes: z
    .string()
    .max(1000, 'Resolution notes must not exceed 1000 characters')
    .optional(),
});

export type ApproveCancellationFormData = z.infer<typeof approveCancellationSchema>;
