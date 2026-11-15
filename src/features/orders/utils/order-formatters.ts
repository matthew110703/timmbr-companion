import type {
  AdminOrderCustomerDto,
  ExtractedShippingDetails,
  GetOrdersQueryParams,
  OrderActivityResponseDto,
  OrderFilterPreset,
  ShippingAddressDto,
} from '../types/order.types';

export function formatCurrency(amount: number | unknown, currency: string = 'INR'): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '₹0';
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }
}

export function formatOrderTimestamp(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) {
    return '—';
  }

  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
}

export type StatCardKey = 'newOrders' | 'processing' | 'outForDelivery' | 'completed';

export function mapStatCardToFilterPreset(cardKey: StatCardKey | string): OrderFilterPreset {
  switch (cardKey) {
    case 'newOrders':
      return 'NEW';
    case 'processing':
      return 'PROCESSING';
    case 'outForDelivery':
      return 'SHIPPED';
    case 'completed':
      return 'DELIVERED';
    default:
      return 'ALL';
  }
}

export function mapFilterPresetToQueryParams(
  preset: OrderFilterPreset,
): Partial<GetOrdersQueryParams> {
  switch (preset) {
    case 'NEW':
      return {
        status: 'CONFIRMED',
        unacknowledgedOnly: true,
        paidOnly: true,
      };
    case 'CONFIRMED':
      return {
        status: 'CONFIRMED',
        paidOnly: true,
      };
    case 'PROCESSING':
      return {
        status: 'PROCESSING',
        paidOnly: true,
      };
    case 'SHIPPED':
      return {
        status: 'SHIPPED',
        paidOnly: true,
      };
    case 'DELIVERED':
      return {
        status: 'DELIVERED',
        paidOnly: true,
      };
    case 'CANCELLED':
      return {
        status: 'CANCELLED',
      };
    case 'ALL':
    default:
      return {
        paidOnly: true,
      };
  }
}

export function isEligibleFulfilmentOrder(order: {
  status: string;
  paymentStatus?: string | null;
}): boolean {
  if (!order) return false;
  if (order.status === 'PENDING') return false;
  if (order.paymentStatus === 'FAILED' || order.paymentStatus === 'PENDING') {
    return false;
  }
  return true;
}

export function extractShippingDetails(
  shippingAddress?: ShippingAddressDto | Record<string, unknown> | null,
  fallbackCustomer?: AdminOrderCustomerDto | null,
): ExtractedShippingDetails {
  const addr = (shippingAddress as Record<string, unknown>) || {};

  const addrName = typeof addr.name === 'string' && addr.name.trim() ? addr.name.trim() : null;
  const firstName = typeof addr.firstName === 'string' ? addr.firstName.trim() : '';
  const lastName = typeof addr.lastName === 'string' ? addr.lastName.trim() : '';
  const combinedName = [firstName, lastName].filter(Boolean).join(' ') || null;

  const recipientName = addrName || combinedName || fallbackCustomer?.name || 'Customer';

  const customerName = fallbackCustomer?.name || recipientName;

  const addrPhone = typeof addr.phone === 'string' && addr.phone.trim() ? addr.phone.trim() : null;
  const contactPhone = addrPhone || fallbackCustomer?.phone || null;
  const customerPhone = fallbackCustomer?.phone || contactPhone;

  const landmark =
    typeof addr.landmark === 'string' && addr.landmark.trim() ? addr.landmark.trim() : null;

  const addressLine1 =
    typeof addr.addressLine1 === 'string'
      ? addr.addressLine1.trim()
      : typeof addr.street === 'string'
        ? addr.street.trim()
        : '';
  const addressLine2 = typeof addr.addressLine2 === 'string' ? addr.addressLine2.trim() : '';
  const city = typeof addr.city === 'string' ? addr.city.trim() : '';
  const state = typeof addr.state === 'string' ? addr.state.trim() : '';
  const postalCode =
    typeof addr.postalCode === 'string'
      ? addr.postalCode.trim()
      : typeof addr.pincode === 'string'
        ? addr.pincode.trim()
        : '';
  const streetParts = [
    addressLine1,
    addressLine2,
    city,
    state ? `${state} ${postalCode}`.trim() : postalCode,
  ].filter(Boolean);

  if (streetParts.length === 0) {
    return {
      customerName,
      customerPhone,
      recipientName,
      contactPhone,
      formattedAddress: 'Address not provided',
      landmark,
    };
  }

  const country =
    typeof addr.country === 'string' && addr.country.trim() ? addr.country.trim() : 'India';

  const formattedAddress = [...streetParts, country].join(', ');

  return {
    customerName,
    customerPhone,
    recipientName,
    contactPhone,
    formattedAddress,
    landmark,
  };
}

export function extractVariantSummary(metadata?: Record<string, unknown> | null): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const prioritizedKeys = [
    'color',
    'colour',
    'finish',
    'woodFinish',
    'wood',
    'fabric',
    'material',
    'size',
    'dimensions',
    'configuration',
  ];

  const matchedSummaries: string[] = [];

  for (const key of prioritizedKeys) {
    const val = metadata[key];
    if (typeof val === 'string' && val.trim()) {
      matchedSummaries.push(val.trim());
    } else if (typeof val === 'number') {
      matchedSummaries.push(String(val));
    }
  }

  if (matchedSummaries.length > 0) {
    return matchedSummaries.join(' / ');
  }

  const genericPairs: string[] = [];
  for (const [k, v] of Object.entries(metadata)) {
    if (['images', 'imageUrl', 'thumbnail', 'slug'].includes(k)) continue;
    if (typeof v === 'string' && v.trim()) {
      genericPairs.push(`${k}: ${v.trim()}`);
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      genericPairs.push(`${k}: ${v}`);
    }
    if (genericPairs.length >= 2) break;
  }

  return genericPairs.length > 0 ? genericPairs.join(', ') : null;
}

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatActivityTime(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—';
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '—';

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export interface ActivityDayParts {
  /** "Today", "Yesterday" or the short weekday. */
  dayName: string;
  /** e.g. "03 Nov 2026". */
  date: string;
  isRelative: boolean;
}

export function formatActivityDayParts(
  isoOrDate: string | Date | null | undefined,
  now: Date = new Date(),
): ActivityDayParts | null {
  if (!isoOrDate) return null;
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return null;

  const dayNum = String(date.getDate()).padStart(2, '0');
  const month = SHORT_MONTH_NAMES[date.getMonth()];
  const formattedDate = `${dayNum} ${month} ${date.getFullYear()}`;

  const dateKey = toLocalDateKey(date);
  if (dateKey === toLocalDateKey(now)) {
    return { dayName: 'Today', date: formattedDate, isRelative: true };
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dateKey === toLocalDateKey(yesterday)) {
    return { dayName: 'Yesterday', date: formattedDate, isRelative: true };
  }

  return {
    dayName: SHORT_DAY_NAMES[date.getDay()],
    date: formattedDate,
    isRelative: false,
  };
}

export function formatActivityDayLabel(
  isoOrDate: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const parts = formatActivityDayParts(isoOrDate, now);
  if (!parts) return 'Unknown Date';
  return parts.isRelative ? `${parts.dayName} · ${parts.date}` : `${parts.dayName}, ${parts.date}`;
}

export interface ActivityDayGroup {
  dateKey: string;
  dayLabel: string;
  dayParts: ActivityDayParts | null;
  items: OrderActivityResponseDto[];
}

export function groupActivitiesByDay(
  activities: OrderActivityResponseDto[],
  now: Date = new Date(),
): ActivityDayGroup[] {
  const groups = new Map<string, ActivityDayGroup>();

  for (const activity of activities) {
    const parsed = activity.createdAt ? new Date(activity.createdAt) : null;
    const isValid = parsed !== null && !Number.isNaN(parsed.getTime());
    const dateKey = isValid ? toLocalDateKey(parsed) : 'unknown';

    let group = groups.get(dateKey);
    if (!group) {
      group = {
        dateKey,
        dayLabel: isValid ? formatActivityDayLabel(parsed, now) : 'Unknown Date',
        dayParts: isValid ? formatActivityDayParts(parsed, now) : null,
        items: [],
      };
      groups.set(dateKey, group);
    }
    group.items.push(activity);
  }

  return Array.from(groups.values());
}
