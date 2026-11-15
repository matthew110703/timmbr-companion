# Timmbr Staff Companion

Timmbr Staff Companion is a lightweight mobile application for workshop staff and delivery personnel. It helps staff acknowledge paid furniture orders, record workshop milestones, send customer updates, and confirm deliveries against `timmbr-core`.

Timmbr products are manufactured after a customer completes checkout. The companion app focuses on order fulfilment and customer communication. It does not handle warehouse inventory, product catalog editing, or billing administration.

## Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Mobile framework | React Native 0.76.7 | Native runtime on Android and iOS |
| Platform toolchain | Expo SDK 58 | Build tooling and native configuration |
| Routing | Expo Router (SDK 58) | File-based typed navigation |
| Server state | TanStack Query v5 | Server cache and mutations |
| Client state | Zustand v5 | Local session and theme state |
| Design system | `@timmbr/native-ui` | Mobile UI primitives |
| Styling engine | NativeWind v4 with Tailwind CSS v3 | Utility styling with CSS variable themes |
| Form validation | React Hook Form with Zod | Type-safe form validation |
| Secure storage | Expo SecureStore | Encrypted auth token storage |
| Icons | `lucide-react-native` and `@timmbr/icons` | Interface iconography |

## Documentation Map

The `docs/` directory documents architecture and engineering standards:

- [System Design](architecture/system-design.md) explains runtime architecture, state boundaries, caching, and network resilience.
- [Order Lifecycle](architecture/order-lifecycle.md) explains macro order states, shop-floor milestones, customer communication, and cancellation rules.
- [API Client Conventions](conventions/api-client.md) explains the centralized HTTP client, token refresh flow, and error normalization.
- [Design System Conventions](conventions/design-system.md) explains `@timmbr/native-ui` primitive usage, theme tokens, and local linking.
- [Environment Conventions](conventions/environment.md) explains build profiles, dynamic bundle identifiers, and Zod boundary checks.
- [String Conventions](conventions/strings.md) explains co-located static strings and string formatting patterns.

## Directory Structure

```text
timmbr-companion/
├── .agents/
│   └── rules.md                  # AI agent engineering rules
├── app/                          # Expo Router file-based screens
│   ├── _layout.tsx               # Root providers and font hydration
│   ├── index.tsx                 # Root boot screen
│   ├── strings.ts                # Root co-located strings
│   ├── (auth)/                   # Staff authentication flow
│   ├── (tabs)/                   # Primary app tabs (Dashboard, Orders, Profile)
│   └── orders/                   # Order details and activity timeline
├── assets/                       # Static fonts and icon assets
├── docs/                         # Architecture specifications and conventions
├── scripts/
│   └── ds-link.mjs               # Yalc linker for @timmbr design system packages
├── src/
│   ├── config/                   # Validated environment configuration
│   ├── features/                 # Domain feature modules (auth, orders, theme)
│   ├── lib/                      # Core infrastructure (api client, token storage)
│   └── types/                    # Ambient ambient types and declarations
├── app.config.ts                 # Dynamic Expo app configuration
├── eas.json                      # Expo Application Services build profiles
├── metro.config.js               # Metro bundler configuration
├── tailwind.config.js            # Tailwind theme tokens and scan globs
└── global.css                    # Semantic CSS theme variables
```

## Getting Started

### 1. Install dependencies

Run the package manager from the project root:

```bash
pnpm install
```

### 2. Configure environment variables

Copy the template environment file:

```bash
cp .env.example .env
```

Verify that `EXPO_PUBLIC_API_URL` points to your running `timmbr-core` server (default is `http://localhost:8000/api/v1`).

### 3. Link the design system (Local Development)

To link `@timmbr/native-ui`, `@timmbr/theme`, `@timmbr/icons`, and `@timmbr/utils` from the sibling `../timmbr-ds` repository:

```bash
pnpm ds:link
```

Check the active link status at any time:

```bash
pnpm ds:status
```

Before committing code, verify that no local `.yalc` links are staged:

```bash
pnpm ds:check
```

To restore published packages from the registry:

```bash
pnpm ds:unlink
```

### 4. Run the development server

Start the Expo bundler:

```bash
# Start bundler with interactive prompt
pnpm start

# Run specifically on Web
pnpm web

# Run on Android emulator or connected device
pnpm android

# Run on iOS simulator
pnpm ios
```

### 5. Run tests and type checks

```bash
# Run unit tests
pnpm test

# Run TypeScript type checks
pnpm check-types

# Run ESLint
pnpm lint
```
