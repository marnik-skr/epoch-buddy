# Epoch Buddy

**Epoch Buddy** is an open-source Solana mobile companion app for tracking the current Solana epoch, epoch progress, estimated completion time, and wallet-related staking information.

The project is designed primarily for Android and the Solana Mobile ecosystem.

## Features

- Current Solana epoch number
- Live epoch progress
- Remaining epoch time estimate
- Current slot information
- Wallet connection through Solana Mobile Wallet Adapter (MWA)
- Read-only wallet and staking information
- Optional epoch notifications
- Persistent wallet session
- Dark mobile-first interface

## Wallet Integration

Epoch Buddy uses the Solana Mobile Wallet Adapter (MWA) to connect to compatible Solana wallets.

The app does not request or store wallet private keys or seed phrases.

Wallet authorization is performed by the user's wallet application. Epoch Buddy stores only the information required to restore the authorized session locally on the device.

Epoch Buddy does not transfer funds or initiate transactions as part of its core epoch-tracking functionality.

## Epoch Tracking

Epoch information is retrieved from the Solana network using RPC requests.

The application uses Solana epoch and slot information to calculate:

- Current epoch
- Epoch progress
- Remaining slots
- Estimated time until the next epoch

The displayed completion time is an estimate because Solana slot duration can vary.

## Notifications

Users can optionally enable notifications for important epoch events:

- Approximately one hour before the current epoch ends
- When the current epoch is expected to end

Notifications are opt-in. If notification permission is declined, all other Epoch Buddy functionality continues to work normally.

## Privacy & Security

Epoch Buddy is designed to collect as little user information as possible.

- No private keys are collected or stored
- No seed phrases are collected
- No advertising SDKs
- No user profiling
- No analytics tracking
- Wallet/session information is stored locally on the device
- Network requests are limited to services required for application functionality

## Technology

Epoch Buddy is built with:

- React Native
- Expo
- TypeScript
- Expo Router
- Solana Mobile Wallet Adapter
- Solana RPC
- Expo Secure Store
- Expo Notifications
- React Native SVG

## Project Structure

    app/                    Application screens and routes
    src/solana/             Solana wallet and session integration
    src/notifications/      Epoch notification logic
    assets/                 Application images and icons
    docs/                   Publisher website and public documentation
    android/                Android-specific configuration

## Local Development

Clone the repository:

    git clone https://github.com/marnik-skr/epoch-buddy.git
    cd epoch-buddy
    npm install
    npx expo start

Some functionality, particularly Solana Mobile Wallet Adapter integration, requires a compatible Android device and wallet.

## Android

Application ID:

    com.marnik.epochbuddy

Epoch Buddy is built and tested as an Android application for the Solana Mobile ecosystem.

## Open Source

The source code is publicly available so users and reviewers can inspect how Epoch Buddy interacts with wallets, stores session information, requests permissions, and communicates with the Solana network.

## Support

Bug reports and technical issues can be submitted through the GitHub Issues section of this repository.

## License

MIT

---

Built for the Solana ecosystem.
