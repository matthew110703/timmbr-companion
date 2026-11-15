import { describe, expect, it } from 'vitest';
import {
  approveCancellationSchema,
  cancelOrderSchema,
  createCustomerUpdateSchema,
  recordManufacturingEventSchema,
  updateOrderStatusSchema,
} from '../schemas/order-operations.schema';

describe('order-operations.schema (Zod Validation Schemas)', () => {
  describe('updateOrderStatusSchema', () => {
    it('accepts valid status values with notes and verificationCode', () => {
      const validCases = [
        { status: 'PROCESSING', notes: 'Starting workshop production' },
        { status: 'SHIPPED', notes: 'Dispatched on truck 4' },
        {
          status: 'DELIVERED',
          notes: 'Customer accepted handover',
          verificationCode: 'DELIV-4921',
        },
      ];

      for (const validCase of validCases) {
        const result = updateOrderStatusSchema.safeParse(validCase);
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status values like PENDING, CANCELLED, or PACKED', () => {
      const invalidCases = [
        { status: 'PENDING' },
        { status: 'CANCELLED' },
        { status: 'PACKED' },
        { status: 'NEW' },
      ];

      for (const invalidCase of invalidCases) {
        const result = updateOrderStatusSchema.safeParse(invalidCase);
        expect(result.success).toBe(false);
      }
    });

    it('rejects notes exceeding 500 characters', () => {
      const result = updateOrderStatusSchema.safeParse({
        status: 'PROCESSING',
        notes: 'A'.repeat(501),
      });

      expect(result.success).toBe(false);
    });

    it('rejects verificationCode exceeding 64 characters', () => {
      const result = updateOrderStatusSchema.safeParse({
        status: 'DELIVERED',
        verificationCode: 'X'.repeat(65),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('recordManufacturingEventSchema', () => {
    it('accepts all 6 defined manufacturing event types', () => {
      const eventTypes = [
        'MATERIAL_PREPARATION',
        'MANUFACTURING_STARTED',
        'MANUFACTURING_UPDATE',
        'QUALITY_CHECK_COMPLETED',
        'READY_FOR_DISPATCH',
        'DELIVERY_COORDINATION',
      ] as const;

      for (const eventType of eventTypes) {
        const result = recordManufacturingEventSchema.safeParse({
          eventType,
          description: 'Valid workshop note',
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects unrecognized event types', () => {
      const result = recordManufacturingEventSchema.safeParse({
        eventType: 'PAINTING_STARTED',
      });

      expect(result.success).toBe(false);
    });

    it('rejects description exceeding 1000 characters', () => {
      const result = recordManufacturingEventSchema.safeParse({
        eventType: 'MANUFACTURING_UPDATE',
        description: 'D'.repeat(1001),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createCustomerUpdateSchema', () => {
    it('accepts customer update with predefined template only', () => {
      const result = createCustomerUpdateSchema.safeParse({
        category: 'PREDEFINED_UPDATE',
        templateKey: 'PRODUCTION_DELAY',
        notifyCustomer: true,
      });

      expect(result.success).toBe(true);
    });

    it('accepts customer update with custom message only', () => {
      const result = createCustomerUpdateSchema.safeParse({
        category: 'CUSTOM_MESSAGE',
        message: 'Your dining table is receiving its final coat of polish.',
        notifyCustomer: false,
      });

      expect(result.success).toBe(true);
    });

    it('accepts customer update with both template and customized message', () => {
      const result = createCustomerUpdateSchema.safeParse({
        category: 'PREDEFINED_UPDATE',
        templateKey: 'QUALITY_CHECK_PASSED',
        message: 'Your furniture has passed our rigorous QA inspection.',
        notifyCustomer: true,
      });

      expect(result.success).toBe(true);
    });

    it('rejects when neither templateKey nor non-empty message is provided', () => {
      const emptyCases = [
        {
          category: 'CUSTOM_MESSAGE',
          message: '',
          notifyCustomer: false,
        },
        {
          category: 'CUSTOM_MESSAGE',
          message: '   ',
          notifyCustomer: true,
        },
        {
          category: 'CUSTOM_MESSAGE',
          notifyCustomer: false,
        },
      ];

      for (const emptyCase of emptyCases) {
        const result = createCustomerUpdateSchema.safeParse(emptyCase);
        expect(result.success).toBe(false);
      }
    });

    it('rejects message exceeding 1000 characters', () => {
      const result = createCustomerUpdateSchema.safeParse({
        category: 'CUSTOM_MESSAGE',
        message: 'M'.repeat(1001),
        notifyCustomer: true,
      });

      expect(result.success).toBe(false);
    });

    it('validates notifyCustomer boolean presence', () => {
      const result = createCustomerUpdateSchema.safeParse({
        category: 'PREDEFINED_UPDATE',
        templateKey: 'MANUFACTURING_STARTED',
        // missing notifyCustomer
      });

      expect(result.success).toBe(false);
    });
  });

  describe('cancelOrderSchema', () => {
    it('accepts valid cancellation payload for direct cancellation', () => {
      const result = cancelOrderSchema.safeParse({
        reason: 'Customer requested cancellation prior to production.',
        internalNotes: 'Customer contacted support hotline.',
        requestApproval: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Customer requested cancellation prior to production.');
      }
    });

    it('accepts valid cancellation payload for approval request', () => {
      const result = cancelOrderSchema.safeParse({
        reason: 'Client relocated and cannot receive custom sectional sofa.',
        requestApproval: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requestApproval).toBe(true);
      }
    });

    it('rejects reason shorter than 3 characters after trimming', () => {
      const invalidReasons = ['', '  ', 'ab', '  x  '];
      for (const reason of invalidReasons) {
        const result = cancelOrderSchema.safeParse({
          reason,
          requestApproval: false,
        });
        expect(result.success).toBe(false);
      }
    });

    it('rejects reason exceeding 500 characters', () => {
      const result = cancelOrderSchema.safeParse({
        reason: 'R'.repeat(501),
        requestApproval: false,
      });

      expect(result.success).toBe(false);
    });

    it('rejects internalNotes exceeding 1000 characters', () => {
      const result = cancelOrderSchema.safeParse({
        reason: 'Valid cancellation reason',
        internalNotes: 'N'.repeat(1001),
        requestApproval: false,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('approveCancellationSchema', () => {
    it('accepts empty or missing resolutionNotes', () => {
      const emptyResult = approveCancellationSchema.safeParse({});
      const undefResult = approveCancellationSchema.safeParse({
        resolutionNotes: undefined,
      });

      expect(emptyResult.success).toBe(true);
      expect(undefResult.success).toBe(true);
    });

    it('accepts valid resolution notes within 1000 characters', () => {
      const result = approveCancellationSchema.safeParse({
        resolutionNotes: 'Approved after verifying raw materials can be repurposed.',
      });

      expect(result.success).toBe(true);
    });

    it('rejects resolutionNotes exceeding 1000 characters', () => {
      const result = approveCancellationSchema.safeParse({
        resolutionNotes: 'N'.repeat(1001),
      });

      expect(result.success).toBe(false);
    });
  });
});
