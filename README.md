# DinnaFind

> /ˈdɪnəˌfaɪnd/ — Because "Yelp" is what you do after eating bad sushi.

Location-aware restaurant discovery for iOS and Android. Save venues to your bucket list, get notified when you're nearby.

## Features

- **Restaurant Discovery** — Search and explore nearby restaurants via Google Places
- **Bucket List** — Save, organize, and track venues
- **Proximity Alerts** — Background geofencing with configurable radius
- **Multi-Auth** — Email/OTP, Apple Sign In, Google OAuth
- **Deep Linking** — Shareable venue links via Branch.io

## Quick Start

```bash
git clone https://github.com/DinnaCo/dinnafind.git
cd dinnafind
bun install
cp .env.example .env.local
bun start
```

## Stack

React Native · Expo · TypeScript · Redux Toolkit · Supabase · Branch.io · Sentry

## Build

```bash
bun build:dev:ios          # Development
bun build:preview:ios      # TestFlight/Internal
bun build:prod:ios         # App Store
```

## License

MIT

---

**Built with** React Native, Expo, TypeScript, and Foodie ❤️
