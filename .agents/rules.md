# Architectural Rules for AI Agents (Timmbr Companion)

1. **Standalone React Native Expo Architecture**:
   `timmbr-companion` is a standalone staff companion mobile application built with Expo SDK 58, Expo Router, and NativeWind v4. All navigation routes live within `app/`. Reusable business logic, store slices, and API clients live within `src/`.

2. **Component-First Principle (`@timmbr/native-ui`)**:
   All UI elements must be imported from `@timmbr/native-ui`, `@timmbr/theme`, and `@timmbr/icons`. Do not write raw unstyled React Native views or ad-hoc styled elements when a design system primitive exists.

3. **Missing Component Protocol**:
   If an element or primitive is missing from `@timmbr/native-ui`, compose existing primitives or contribute the component to `timmbr-ds`. Never invent unvetted ad-hoc UI replacements.

4. **Strict Theme Compliance**:
   Colors, typography scales (`DM Serif Display`, `Manrope`, `Outfit`), radius tokens, and spacing tokens must derive strictly from `@timmbr/theme` via NativeWind semantic utility classes. Any departure requires explicit operator consent.

5. **Centralized Static Strings (`src/strings/`)**:
   All static UI copy, button labels, titles, and error messages live in `src/strings/` modules (`root.ts`, `auth.ts`, `tabs.ts`, `orders.ts`), kept outside `app/` so Expo Router does not treat them as routes. Never hardcode inline strings in JSX. See `docs/conventions/strings.md`.

6. **Centralized API Communication (`ApiClient`)**:
   Centralize all backend API interactions in `src/lib/api/` via the typed `ApiClient` singleton. Every request must attach `x-client-platform: staff-companion`, bearer authorization tokens, and request correlation IDs. Never scatter raw `fetch()` or `axios` calls across components.

7. **Boundary Validation via Zod**:
   External inputs (environment variables, backend responses, forms) must be parsed and validated at system boundaries with Zod schemas. Internal functions must trust the resulting typed models.

8. **Form Handling**:
   Standardize forms on `react-hook-form` paired with `@hookform/resolvers/zod`.

9. **Design System Linking via Yalc**:
   Local design system development uses `pnpm ds:link` via Yalc. Never use raw symlinks or direct file references that break Metro bundling. Run `pnpm ds:check` before committing.

10. **Strict Git Safety**:
    Never run `git add`, `git commit`, or `git push`. Version control actions remain strictly the operator's prerogative.
