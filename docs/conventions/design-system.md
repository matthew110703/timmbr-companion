# Design System Conventions

`timmbr-companion` consumes `@timmbr/native-ui` and `@timmbr/theme` from the Timmbr Enterprise Design System. All user interface components must derive from these packages.

## Primitives in `@timmbr/native-ui`

The `@timmbr/native-ui` package exports 20 mobile UI primitives built with Gluestack UI v2 and NativeWind v4:

| Category | Primitives |
| --- | --- |
| Layout | `Box`, `VStack`, `HStack`, `Divider` |
| Typography | `Text`, `Heading` |
| Actions | `Button`, `Pressable` |
| Data Display | `Badge`, `Card`, `Avatar` |
| Forms | `Input`, `Textarea`, `Switch` |
| Feedback | `Spinner`, `Toast` |
| Navigation | `Tabs` |
| Overlays | `Actionsheet`, `Modal` |
| Media | `Icon` |

## Theme Tokens and Semantic Mapping

`@timmbr/theme` tokens map directly to CSS variables inside `global.css`.

### Colors

```text
Light Mode:
- background: rgb(255, 255, 255)
- foreground: rgb(11, 11, 11)
- primary:    rgb(192, 100, 58)    (#C0643A)
- card:       rgb(255, 255, 255)
- secondary:  rgb(245, 237, 224)   (#F5EDE0)
- border:     rgb(231, 231, 231)   (#E7E7E7)

Dark Mode:
- background: rgb(11, 11, 11)     (#0B0B0B)
- foreground: rgb(247, 241, 230)   (#F7F1E6)
- primary:    rgb(192, 100, 58)    (#C0643A)
- card:       rgb(35, 35, 35)      (#232323)
- secondary:  rgb(60, 60, 60)      (#3C3C3C)
- border:     rgb(60, 60, 60)      (#3C3C3C)
```

### Typography Fonts
Use the defined Tailwind font families:
- Display font: `font-serif` (`DM Serif Display`)
- Heading font: `font-display` (`Outfit`)
- Body and UI font: `font-sans` (`Manrope`)

## Local Linking via Yalc

When developing against local changes in `timmbr-ds`, link the packages with Yalc:

```bash
# Link all design system packages into timmbr-companion
pnpm ds:link

# Or link only native-ui
pnpm ds:link native-ui

# Inspect link status
pnpm ds:status

# Verify no links are staged before committing
pnpm ds:check

# Unlink and restore registry packages
pnpm ds:unlink
```

Do not use `pnpm link` with direct folder paths. Metro requires isolated resolution within the application directory.

## Missing Component Protocol

If a screen design requires an element not provided by `@timmbr/native-ui`:
1. Compose the requirement using existing primitives (`Box`, `VStack`, `HStack`, `Pressable`, `Text`).
2. If the pattern is reusable across multiple screens, submit an issue or PR to `timmbr-ds` under `packages/native-ui/src/components/`.
3. Never write ad-hoc style sheets or inline pixel styles that bypass `@timmbr/theme`.
