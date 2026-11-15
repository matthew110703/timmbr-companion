import { describe, expect, it } from 'vitest';
import {
  extractShippingDetails,
  extractVariantSummary,
  formatActivityDayLabel,
  formatActivityDayParts,
  formatActivityTime,
  formatCurrency,
  formatOrderTimestamp,
  groupActivitiesByDay,
  isEligibleFulfilmentOrder,
  mapFilterPresetToQueryParams,
  mapStatCardToFilterPreset,
} from '../utils/order-formatters';

describe('order-formatters', () => {
  describe('formatCurrency', () => {
    it('formats numbers as INR currency', () => {
      expect(formatCurrency(45000)).toMatch(/₹\s*45,000/);
      expect(formatCurrency(0)).toMatch(/₹\s*0/);
      expect(formatCurrency(1250.75)).toMatch(/₹\s*1,251/);
    });

    it('handles negative amounts and non-number inputs gracefully', () => {
      expect(formatCurrency(-500)).toContain('500');
      expect(formatCurrency('invalid')).toBe('₹0');
      expect(formatCurrency(null)).toBe('₹0');
    });
  });

  describe('formatOrderTimestamp', () => {
    it('formats ISO date strings into readable human timestamps', () => {
      const formatted = formatOrderTimestamp('2026-11-09T10:30:00.000Z');
      expect(formatted).not.toBe('—');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Nov');
    });

    it('handles Date instances', () => {
      const date = new Date(2026, 10, 9, 14, 15);
      const formatted = formatOrderTimestamp(date);
      expect(formatted).toContain('09 Nov 2026');
      expect(formatted).toContain('02:15 PM');
    });

    it('returns fallback dash for null, undefined, or invalid date values', () => {
      expect(formatOrderTimestamp(null)).toBe('—');
      expect(formatOrderTimestamp(undefined)).toBe('—');
      expect(formatOrderTimestamp('invalid-date')).toBe('—');
    });
  });

  describe('mapStatCardToFilterPreset', () => {
    it('maps dashboard statistic card keys to filter presets', () => {
      expect(mapStatCardToFilterPreset('newOrders')).toBe('NEW');
      expect(mapStatCardToFilterPreset('processing')).toBe('PROCESSING');
      expect(mapStatCardToFilterPreset('outForDelivery')).toBe('SHIPPED');
      expect(mapStatCardToFilterPreset('completed')).toBe('DELIVERED');
      expect(mapStatCardToFilterPreset('unknown')).toBe('ALL');
    });
  });

  describe('mapFilterPresetToQueryParams', () => {
    it('maps NEW to CONFIRMED with unacknowledgedOnly and paidOnly', () => {
      expect(mapFilterPresetToQueryParams('NEW')).toEqual({
        status: 'CONFIRMED',
        unacknowledgedOnly: true,
        paidOnly: true,
      });
    });

    it('maps CONFIRMED to status CONFIRMED and paidOnly', () => {
      expect(mapFilterPresetToQueryParams('CONFIRMED')).toEqual({
        status: 'CONFIRMED',
        paidOnly: true,
      });
    });

    it('maps PROCESSING to status PROCESSING and paidOnly', () => {
      expect(mapFilterPresetToQueryParams('PROCESSING')).toEqual({
        status: 'PROCESSING',
        paidOnly: true,
      });
    });

    it('maps SHIPPED (Out for Delivery) to status SHIPPED and paidOnly', () => {
      expect(mapFilterPresetToQueryParams('SHIPPED')).toEqual({
        status: 'SHIPPED',
        paidOnly: true,
      });
    });

    it('maps DELIVERED to status DELIVERED and paidOnly', () => {
      expect(mapFilterPresetToQueryParams('DELIVERED')).toEqual({
        status: 'DELIVERED',
        paidOnly: true,
      });
    });

    it('maps CANCELLED to status CANCELLED', () => {
      expect(mapFilterPresetToQueryParams('CANCELLED')).toEqual({
        status: 'CANCELLED',
      });
    });

    it('maps ALL to paidOnly true', () => {
      expect(mapFilterPresetToQueryParams('ALL')).toEqual({
        paidOnly: true,
      });
    });
  });

  describe('isEligibleFulfilmentOrder', () => {
    it('rejects orders with status PENDING', () => {
      expect(isEligibleFulfilmentOrder({ status: 'PENDING', paymentStatus: 'PAID' })).toBe(false);
    });

    it('rejects orders with paymentStatus FAILED or PENDING', () => {
      expect(
        isEligibleFulfilmentOrder({
          status: 'CONFIRMED',
          paymentStatus: 'FAILED',
        }),
      ).toBe(false);
      expect(
        isEligibleFulfilmentOrder({
          status: 'CONFIRMED',
          paymentStatus: 'PENDING',
        }),
      ).toBe(false);
    });

    it('accepts paid orders with valid lifecycle statuses', () => {
      expect(
        isEligibleFulfilmentOrder({
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        }),
      ).toBe(true);
      expect(
        isEligibleFulfilmentOrder({
          status: 'PROCESSING',
          paymentStatus: 'PAID',
        }),
      ).toBe(true);
      expect(
        isEligibleFulfilmentOrder({
          status: 'SHIPPED',
          paymentStatus: 'PAID',
        }),
      ).toBe(true);
      expect(
        isEligibleFulfilmentOrder({
          status: 'DELIVERED',
          paymentStatus: 'PAID',
        }),
      ).toBe(true);
      expect(
        isEligibleFulfilmentOrder({
          status: 'CANCELLED',
          paymentStatus: 'PAID',
        }),
      ).toBe(true);
    });
  });

  describe('extractShippingDetails', () => {
    it('extracts full structured address with recipient, phone, and landmark', () => {
      const address = {
        name: 'Jane Doe',
        phone: '+91 98765 43210',
        addressLine1: 'Plot 42, Woodworkers Enclave',
        addressLine2: 'Industrial Area Phase 2',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560068',
        country: 'India',
        landmark: 'Opposite Timber Depot',
      };

      const result = extractShippingDetails(address, {
        id: 'user-1',
        name: 'Jane Doe Account',
        email: 'jane@example.com',
        phone: '+91 98765 43210',
      });

      expect(result.recipientName).toBe('Jane Doe');
      expect(result.customerName).toBe('Jane Doe Account');
      expect(result.contactPhone).toBe('+91 98765 43210');
      expect(result.landmark).toBe('Opposite Timber Depot');
      expect(result.formattedAddress).toContain('Plot 42, Woodworkers Enclave');
      expect(result.formattedAddress).toContain('Bengaluru, Karnataka 560068, India');
    });

    it('falls back to customer details when address recipient and phone are missing', () => {
      const result = extractShippingDetails(
        {
          street: '123 Main St',
          city: 'Mumbai',
        },
        {
          id: 'user-2',
          name: 'Rahul Sharma',
          email: 'rahul@example.com',
          phone: '+91 99999 11111',
        },
      );

      expect(result.recipientName).toBe('Rahul Sharma');
      expect(result.contactPhone).toBe('+91 99999 11111');
      expect(result.landmark).toBeNull();
      expect(result.formattedAddress).toContain('123 Main St, Mumbai');
    });

    it('handles empty or missing address gracefully', () => {
      const result = extractShippingDetails(null, null);
      expect(result.recipientName).toBe('Customer');
      expect(result.contactPhone).toBeNull();
      expect(result.landmark).toBeNull();
      expect(result.formattedAddress).toBe('Address not provided');
    });
  });

  describe('extractVariantSummary', () => {
    it('extracts prioritized finish, wood, and size attributes', () => {
      const metadata = {
        woodFinish: 'Natural Teak',
        fabric: 'Forest Green Velvet',
        size: '3-Seater',
      };
      const summary = extractVariantSummary(metadata);
      expect(summary).toBe('Natural Teak / Forest Green Velvet / 3-Seater');
    });

    it('falls back to generic key-value formatting when standard keys are absent', () => {
      const metadata = {
        cushionDensity: 'High Resilience 45D',
        legColor: 'Matte Black',
      };
      const summary = extractVariantSummary(metadata);
      expect(summary).toContain('cushionDensity: High Resilience 45D');
    });

    it('returns null when metadata is empty or non-object', () => {
      expect(extractVariantSummary(null)).toBeNull();
      expect(extractVariantSummary({})).toBeNull();
    });
  });

  describe('timeline day grouping & time formatting', () => {
    it('formats activity time in 12-hour format and handles invalid inputs', () => {
      const morning = new Date(2026, 10, 14, 9, 5);
      const afternoon = new Date(2026, 10, 14, 13, 43);
      expect(formatActivityTime(morning)).toBe('09:05 AM');
      expect(formatActivityTime(afternoon)).toBe('01:43 PM');
      expect(formatActivityTime(null)).toBe('—');
      expect(formatActivityTime('not-a-date')).toBe('—');
    });

    it('formats day labels for Today, Yesterday, and older dates', () => {
      const now = new Date(2026, 10, 14, 15, 0);
      expect(formatActivityDayLabel(new Date(2026, 10, 14, 10, 0), now)).toBe(
        'Today · 14 Nov 2026',
      );
      expect(formatActivityDayLabel(new Date(2026, 10, 13, 18, 0), now)).toBe(
        'Yesterday · 13 Nov 2026',
      );
      expect(formatActivityDayLabel(new Date(2026, 10, 3, 1, 43), now)).toBe('Tue, 03 Nov 2026');
    });

    it('groups activities by local calendar day while preserving order', () => {
      const now = new Date(2026, 10, 14, 18, 0);
      const activities = [
        {
          id: 'a1',
          orderId: 'order-1',
          eventType: 'SHIPPED',
          description: 'Dispatched',
          isCustomerVisible: true,
          createdAt: new Date(2026, 10, 14, 11, 30).toISOString(),
        },
        {
          id: 'a2',
          orderId: 'order-1',
          eventType: 'QUALITY_CHECK_COMPLETED',
          description: 'Passed QA',
          isCustomerVisible: false,
          createdAt: new Date(2026, 10, 14, 9, 15).toISOString(),
        },
        {
          id: 'a3',
          orderId: 'order-1',
          eventType: 'ORDER_CONFIRMED',
          description: 'Confirmed',
          isCustomerVisible: true,
          createdAt: new Date(2026, 10, 3, 1, 43).toISOString(),
        },
      ];

      const groups = groupActivitiesByDay(activities, now);
      expect(groups).toHaveLength(2);
      expect(groups[0].dayLabel).toBe('Today · 14 Nov 2026');
      expect(groups[0].items.map((item) => item.id)).toEqual(['a1', 'a2']);
      expect(groups[1].dayLabel).toBe('Tue, 03 Nov 2026');
      expect(groups[1].items.map((item) => item.id)).toEqual(['a3']);
      expect(groups[0].dayParts).toEqual({
        dayName: 'Today',
        date: '14 Nov 2026',
        isRelative: true,
      });
      expect(groups[1].dayParts).toEqual({
        dayName: 'Tue',
        date: '03 Nov 2026',
        isRelative: false,
      });
    });

    it('splits day labels into a day name and date, or null when invalid', () => {
      const now = new Date(2026, 10, 14, 15, 0);
      expect(formatActivityDayParts(new Date(2026, 10, 13, 18, 0), now)).toEqual({
        dayName: 'Yesterday',
        date: '13 Nov 2026',
        isRelative: true,
      });
      expect(formatActivityDayParts('not-a-date', now)).toBeNull();
      expect(formatActivityDayParts(null, now)).toBeNull();
    });
  });
});
