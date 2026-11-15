import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as Linking from 'expo-linking';
import {
  buildMapsSearchUrl,
  buildPhoneCallUrl,
  openAddressInMaps,
  openCustomerPhoneCall,
} from '../utils/native-linking';

vi.mock('expo-linking', () => ({
  openURL: vi.fn(),
  canOpenURL: vi.fn(),
}));

describe('native-linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildPhoneCallUrl', () => {
    it('sanitizes international numbers with leading plus', () => {
      expect(buildPhoneCallUrl('+91 98765 43210')).toBe('tel:+919876543210');
      expect(buildPhoneCallUrl('+1 (555) 123-4567')).toBe('tel:+15551234567');
    });

    it('sanitizes national numbers without plus', () => {
      expect(buildPhoneCallUrl('080-41234567')).toBe('tel:08041234567');
      expect(buildPhoneCallUrl('9876543210')).toBe('tel:9876543210');
    });

    it('rejects invalid or too short phone numbers', () => {
      expect(buildPhoneCallUrl('')).toBeNull();
      expect(buildPhoneCallUrl('123')).toBeNull();
      expect(buildPhoneCallUrl('abc')).toBeNull();
      expect(buildPhoneCallUrl(null)).toBeNull();
      expect(buildPhoneCallUrl(undefined)).toBeNull();
    });
  });

  describe('buildMapsSearchUrl', () => {
    const address = 'Plot 42, Woodworkers Enclave, Bengaluru, Karnataka';
    const encoded = encodeURIComponent(address);

    it('generates iOS maps URL scheme', () => {
      const url = buildMapsSearchUrl(address, 'ios');
      expect(url).toBe(`maps:0,0?q=${encoded}`);
    });

    it('generates Android geo URL scheme', () => {
      const url = buildMapsSearchUrl(address, 'android');
      expect(url).toBe(`geo:0,0?q=${encoded}`);
    });

    it('generates Google Maps web URL scheme for web or fallback platforms', () => {
      const url = buildMapsSearchUrl(address, 'web');
      expect(url).toBe(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    });

    it('returns null for empty or invalid address strings', () => {
      expect(buildMapsSearchUrl('')).toBeNull();
      expect(buildMapsSearchUrl('   ')).toBeNull();
      expect(buildMapsSearchUrl(null)).toBeNull();
      expect(buildMapsSearchUrl(undefined)).toBeNull();
    });
  });

  describe('openCustomerPhoneCall', () => {
    it('opens sanitized tel URI when phone is valid', async () => {
      vi.mocked(Linking.canOpenURL).mockResolvedValue(true);
      vi.mocked(Linking.openURL).mockResolvedValue(true);

      const success = await openCustomerPhoneCall('+91 98765 43210');
      expect(success).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith('tel:+919876543210');
    });

    it('returns false when phone is invalid without attempting to open', async () => {
      const success = await openCustomerPhoneCall('invalid');
      expect(success).toBe(false);
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('openAddressInMaps', () => {
    it('opens native or web maps link for valid address', async () => {
      vi.mocked(Linking.canOpenURL).mockResolvedValue(true);
      vi.mocked(Linking.openURL).mockResolvedValue(true);

      const success = await openAddressInMaps('MG Road, Bengaluru');
      expect(success).toBe(true);
      expect(Linking.openURL).toHaveBeenCalled();
    });

    it('returns false for empty address without invoking Linking', async () => {
      const success = await openAddressInMaps('');
      expect(success).toBe(false);
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });
});
