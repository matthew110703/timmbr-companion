import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

export function buildPhoneCallUrl(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 5) {
    return null;
  }

  const sanitized = hasPlus ? `+${digits}` : digits;
  return `tel:${sanitized}`;
}

export function buildMapsSearchUrl(
  address?: string | null,
  platform: string = Platform.OS,
): string | null {
  if (!address || typeof address !== 'string' || !address.trim()) {
    return null;
  }

  const encodedQuery = encodeURIComponent(address.trim());

  if (platform === 'ios') {
    return `maps:0,0?q=${encodedQuery}`;
  }

  if (platform === 'android') {
    return `geo:0,0?q=${encodedQuery}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}

export async function openCustomerPhoneCall(phone?: string | null): Promise<boolean> {
  const url = buildPhoneCallUrl(phone);
  if (!url) {
    return false;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function openAddressInMaps(address?: string | null): Promise<boolean> {
  const nativeUrl = buildMapsSearchUrl(address, Platform.OS);
  if (!nativeUrl) {
    return false;
  }

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return true;
    }
  } catch {}

  const webUrl = buildMapsSearchUrl(address, 'web');
  if (webUrl) {
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
