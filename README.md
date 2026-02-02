# Epoch Buddy

**Epoch Buddy** is a lightweight Solana companion app that helps you understand the current epoch at a glance.

Track how far we are into the epoch, estimate when the next one starts, and optionally get notified before it ends.

---

## Features

- Live epoch countdown
- Progress bar based on slot index
- Optional notifications
  - 1 hour before epoch end
  - At epoch end
- Wallet-safe
  - Read-only
  - No funds moved
  - Signature only (when required)

---

## Screens

- Welcome – connect your wallet
- Epoch – current epoch, ETA, slot progress
- Portfolio – staking-related insights (read-only)

---

## Tech Stack

- Expo / React Native
- TypeScript
- expo-router
- Solana RPC
- react-native-svg
- expo-notifications

SVG support is enabled via `react-native-svg-transformer`.

---

## Getting Started (Local Dev)

```bash
npm install
npx expo start
```

Run on:
- Android device or emulator
- iOS simulator
- Expo Go (limited feature support)

---

## Notifications

Notifications are opt-in and only scheduled after explicit user interaction.

If notification permissions are denied, the app continues to function normally without alerts.

---

## Development Notes

- File-based routing via expo-router
- SVGs are imported as React components
- Notification scheduling is debounced to avoid unnecessary RPC calls
- Designed with dark mode as the default (Solana mobile friendly)

---

## Security & Privacy

- No private keys are stored
- Wallet addresses are stored locally only
- No analytics or tracking
- No background network activity beyond Solana RPC requests

---

## License

MIT

---

Built for the Solana ecosystem.
