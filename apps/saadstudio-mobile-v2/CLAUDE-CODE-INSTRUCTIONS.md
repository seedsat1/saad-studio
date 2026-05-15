# Saad Studio Mobile V2

This app is a standalone Expo React Native mobile app. Do not rebuild it as a WebView, Capacitor shell, or Next.js export.

## Architecture

- Expo React Native with TypeScript
- Expo Router for native routes
- Clerk scaffold via `@clerk/clerk-expo`
- Native UI components and React Native styling
- No dependency on the Next.js app runtime
- API integrations should call the Saad Studio backend through `EXPO_PUBLIC_SAAD_API_URL`

## Current Experience

- Cinematic generate screen
- Advanced prompt composer
- Native generation controls for mode, model, aspect ratio, quality, duration, and sound
- Scene Studio timeline preview
- Floating glassmorphism panels
- Premium bottom navigation
- Haptic feedback and native press animation

## Run

```bash
cd apps/saadstudio-mobile-v2
npm install
npx expo start
```

Set environment values from `.env.example` before wiring Clerk or backend calls.

## Product Direction

Prioritize a premium mobile-first AI creation workflow:

- Immersive generate screen
- Realistic model controls
- Scene timeline and shot planning
- Professional spacing and readable mobile hierarchy
- Native transitions, haptics, and gesture-friendly controls
- No generic dashboard templates
- No cramped forms
- No web wrapper architecture

