# String Conventions

All static copy, labels, headings, button text, and error messages in `timmbr-companion` live in `src/strings/` modules, never inline in JSX.

## String Modules

The modules live outside `app/` so Expo Router does not treat them as route segments:
- `src/strings/root.ts`: Root layout, global navigation, and fallback strings.
- `src/strings/auth.ts`: Login form, credential validation, and auth error banners.
- `src/strings/tabs.ts`: Dashboard cards, orders filter tabs, and profile screen copy.
- `src/strings/orders.ts`: Order details tabs, activity ledger, and action sheet options.

## Structure of a `strings.ts` File

Strings are grouped by feature section in a plain `as const` object:

```typescript
export const strings = {
  screen: {
    title: 'Order Details',
    activityTab: 'Activity',
    detailsTab: 'Items and Customer',
  },
  actions: {
    acknowledge: 'Acknowledge Order',
    startManufacturing: 'Start Manufacturing',
    sendCustomerUpdate: 'Send Customer Update',
    markDelivered: 'Confirm Delivery',
    cancelOrder: 'Cancel Order',
  },
  statusBadges: {
    confirmed: 'Payment Confirmed',
    processing: 'In Production',
    shipped: 'Out for Delivery',
    delivered: 'Completed',
    cancelled: 'Cancelled',
  },
  errors: {
    unauthorizedRole: 'Staff credentials required to access this application.',
    networkTimeout: 'Server took too long to respond. Please check your connection.',
    orderNotFound: 'Order could not be located.',
  },
  formatters: {
    itemCount: (count: number) =>
      count === 1 ? '1 item' : `${count} items`,
    orderNumber: (orderNumber: string) => `Order #${orderNumber}`,
    customerNameFallback: 'Guest Customer',
  },
} as const;
```

## Parameter Interpolation

When UI text requires dynamic parameters (such as counts, order numbers, or names), define a pure formatter function inside the `strings` object:

```typescript
// Define in strings.ts
export const strings = {
  orderCard: {
    totalPaid: (amount: string) => `Total: ${amount}`,
    itemSummary: (count: number) =>
      count === 1 ? '1 piece in build' : `${count} pieces in build`,
  },
} as const;

// Consume in Component
import { strings } from './strings';

<Text className="text-sm text-foreground">
  {strings.orderCard.itemSummary(order.items.length)}
</Text>
```

## Anti-Patterns

1. **Do not hardcode text inside JSX**:
   ```tsx
   // Disallowed
   <Text className="text-lg">Dashboard Overview</Text>

   // Allowed
   <Text className="text-lg">{strings.dashboard.overviewTitle}</Text>
   ```

2. **Do not concatenate UI fragments in JSX**:
   ```tsx
   // Disallowed
   <Text>Order #{order.orderNumber} - {order.items.length} items</Text>

   // Allowed
   <Text>{strings.formatters.orderHeadline(order.orderNumber, order.items.length)}</Text>
   ```

3. **Do not duplicate copy across files**:
   Reuse shared domain copy from `app/strings.ts` when identical copy spans multiple independent routes.
