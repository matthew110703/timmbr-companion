export type OrderStatus =
  'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentProvider = 'STRIPE' | 'RAZORPAY' | 'CASH' | 'BANK_TRANSFER' | string;

export type OrderFilterPreset =
  'ALL' | 'NEW' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface DashboardStatsCountsDto {
  newOrders: number;
  processing: number;
  outForDelivery: number;
  completed: number;
}

export interface AdminOrderCustomerDto {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface AdminOrderListItemDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus | null;
  paymentMethod?: PaymentProvider | null;
  thumbnail?: string | null;
  acknowledgedAt?: string | null;
  grandTotal: number;
  currency: string;
  itemsCount: number;
  customer: AdminOrderCustomerDto;
  placedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface DashboardStatsResponseDto {
  counts: DashboardStatsCountsDto;
  recentOrders: AdminOrderListItemDto[];
}

export interface ShippingAddressDto {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  pincode?: string;
  country?: string;
  [key: string]: unknown;
}

export interface OrderItemResponseDto {
  id: string;
  orderId: string;
  productId: string | null;
  variantId?: string | null;
  name: string;
  sku?: string | null;
  quantity: number;
  originalUnitPrice?: number;
  unitPrice: number;
  discountAmount?: number;
  totalPrice: number;
  hsnCode?: string | null;
  gstRate?: number;
  taxAmount?: number;
  metadata?: Record<string, unknown> | null;
  thumbnail?: string | null;
  productSlug?: string | null;
  createdAt: string;
}

export interface OrderInvoiceSummaryDto {
  id: string;
  invoiceNumber: string;
  status: string;
  pdfStatus: string;
  issuedAt: string;
}

export interface OrderResponseDto {
  id: string;
  orderNumber: string;
  userId: string;
  cartId?: string | null;
  status: OrderStatus;
  paymentStatus?: PaymentStatus | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
  currency: string;
  paymentMethod?: PaymentProvider | null;
  acknowledgedAt?: string | null;
  acknowledgedById?: string | null;
  installationRequired: boolean;
  shippingAddressId?: string | null;
  shippingAddress?: ShippingAddressDto | Record<string, unknown> | null;
  billingAddressId?: string | null;
  billingAddress?: Record<string, unknown> | null;
  placedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponseDto[];
  payments?: unknown[];
  invoice?: OrderInvoiceSummaryDto | null;
}

export interface OrderActivityStaffDto {
  id: string;
  name: string;
  role: string;
}

export interface OrderNotificationDeliveryDto {
  id: string;
  channel: string;
  recipient: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  sentAt?: string | null;
  lastError?: string | null;
  createdAt: string;
}

export interface OrderActivityResponseDto {
  id: string;
  orderId: string;
  staffId?: string | null;
  staff?: OrderActivityStaffDto | null;
  eventType: string;
  description: string;
  updateCategory?: string | null;
  isCustomerVisible: boolean;
  metadata?: Record<string, unknown> | null;
  notification?: OrderNotificationDeliveryDto | null;
  createdAt: string;
}

export interface OrderTimelineResponseDto {
  orderId: string;
  hasManufacturingStarted: boolean;
  pendingCancellationRequest?: OrderActivityResponseDto | null;
  activities: OrderActivityResponseDto[];
}

export interface GetOrdersQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  unacknowledgedOnly?: boolean;
  paidOnly?: boolean;
  sortBy?: 'createdAt' | 'placedAt' | 'grandTotal';
  order?: 'asc' | 'desc';
}

export interface ExtractedShippingDetails {
  customerName: string;
  customerPhone: string | null;
  recipientName: string;
  contactPhone: string | null;
  formattedAddress: string;
  landmark: string | null;
}

export type ManufacturingEventType =
  | 'MATERIAL_PREPARATION'
  | 'MANUFACTURING_STARTED'
  | 'MANUFACTURING_UPDATE'
  | 'QUALITY_CHECK_COMPLETED'
  | 'READY_FOR_DISPATCH'
  | 'DELIVERY_COORDINATION';

export type CustomerUpdateCategory =
  | 'PREDEFINED_UPDATE'
  | 'CUSTOM_MESSAGE'
  | 'MANUFACTURING_UPDATE'
  | 'DELAY_NOTIFICATION'
  | 'DELIVERY_COORDINATION';

export type CustomerUpdateTemplateKey =
  | 'MANUFACTURING_STARTED'
  | 'IN_PRODUCTION'
  | 'PRODUCTION_DELAY'
  | 'QUALITY_CHECK_PASSED'
  | 'DELIVERY_COORDINATION';

export interface UpdateOrderStatusDto {
  status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  notes?: string;
  verificationCode?: string;
}

export interface CreateOrderActivityDto {
  eventType: ManufacturingEventType;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface CreateCustomerUpdateDto {
  category: CustomerUpdateCategory;
  message?: string;
  templateKey?: CustomerUpdateTemplateKey;
  notifyCustomer?: boolean;
  idempotencyKey?: string;
}

export interface CancelOrderDto {
  reason: string;
  internalNotes?: string;
  requestApproval?: boolean;
}

export interface CancelOrderResponseDto {
  order: OrderResponseDto;
  cancellationState: 'CANCELLED' | 'APPROVAL_REQUESTED';
  activity: OrderActivityResponseDto;
}

export interface ApproveCancellationDto {
  resolutionNotes?: string;
}
