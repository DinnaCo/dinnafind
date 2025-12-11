<p align="center">
  <img src="assets/images/icon.icon/Assets/DinnaFind.png" alt="DinnaFind Logo" width="120" height="120">
</p>

<h1 align="center">DinnaFind</h1>

<p align="center">
  <em>/ˈdɪnəˌfaɪnd/</em> — Because "Yelp" is what you do after eating bad sushi.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white" alt="React Native">
  <img src="https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo&logoColor=white" alt="Expo">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white" alt="Supabase">
</p>

<p align="center">
  <a href="https://github.com/DinnaCo/dinnafind/actions/workflows/codeql.yml"><img src="https://github.com/DinnaCo/dinnafind/actions/workflows/codeql.yml/badge.svg" alt="CodeQL"></a>
  <a href="https://github.com/DinnaCo/dinnafind"><img src="https://img.shields.io/github/stars/DinnaCo/dinnafind?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="https://dinnafind.com"><img src="https://img.shields.io/badge/Website-dinnafind.com-FF6B6B?style=for-the-badge&logo=safari&logoColor=white" alt="Website"></a>
</p>

---

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

React Native · Expo SDK 54 · TypeScript · Redux Toolkit · Supabase · Branch.io · Sentry

## Build

```bash
bun build:dev:ios          # Development
bun build:preview:ios      # TestFlight/Internal
bun build:prod:ios         # App Store
```

## License

MIT — see [LICENSE](./LICENSE)

---

**Built with** React Native, Expo, TypeScript, Branch.io, and Foodie ❤️
