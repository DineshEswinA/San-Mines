# SM-Client — San Mines Mobile App

React Native mobile application for the San Mines lorry tracking system. Built with **Expo** and **TypeScript**, connected to **Supabase** for authentication and the **SM-Server** backend for trip management.

---

## Overview

SM-Client provides role-specific interfaces for two types of operators. After login, the app presents a tailored workflow based on the user's assigned role.

| Role | Interface |
|---|---|
| **Quarry Operator** | Check in arriving lorries · View and manage the quarry queue · Check out lorries with material details |
| **Unload Operator** | Monitor the incoming transit fleet · Verify lorry arrivals · Capture unload photos and close trips |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Auth & DB | Supabase |
| Navigation | Manual role/tab state (no React Navigation) |
| Camera | expo-camera |
| Location | expo-location |
| Icons | lucide-react-native |
| Storage | @react-native-async-storage/async-storage |

---

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- iOS Simulator, Android Emulator, or the **Expo Go** app on a physical device
- SM-Server running and reachable
- Supabase project credentials

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the Expo dev server
npm start

# Open on a specific platform
npm run ios
npm run android
npm run web
```

Scan the QR code in your terminal with the **Expo Go** app, or press `i` / `a` to open in a simulator.

---

## Configuration

Create a `.env` file (or set Expo public env vars) in the project root:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> **Android Emulator:** `localhost` is automatically remapped to `10.0.2.2`.  
> **Physical devices:** The app resolves the host machine's LAN IP from Expo's `hostUri` automatically.

---

## Screens

### Auth Flow

| Screen | Description |
|---|---|
| `LoginScreen` | Email + password login via Supabase Auth |
| `SignupScreen` | New account registration with full name, email, and password |

### Quarry Operator

| Screen | Description |
|---|---|
| `CheckInScreen` | Form to register a lorry entering the quarry — transporter name, vehicle number, date, and time |
| `QuarryQueueScreen` | Live list of lorries currently `INSIDE_QUARRY`; tap to initiate a check-out with material, tyre count, weight, and optional photo |

### Unload Operator

| Screen | Description |
|---|---|
| `IncomingFleetScreen` | Two-tab view: **Incoming** (lorries `IN_TRANSIT`) and **History** (completed trips); tap incoming lorry to open verification form with photo capture |

---

## App Navigation

There is no third-party navigation library. Routing is driven by React state:

```
isAuthenticated?
  No  → LoginScreen / SignupScreen
  Yes →
    role === QUARRY_OPERATOR → CheckInScreen | QuarryQueueScreen (tab bar)
    role === UNLOAD_OPERATOR → IncomingFleetScreen
```

A role-switcher dropdown in the header lets operators toggle roles during development and testing.

---

## Key Components

| Component | Purpose |
|---|---|
| `Button` | Themed primary/secondary action button |
| `Input` | Styled text input with validation error display |
| `DateTimeField` | Specialised input variant for date and time entry |
| `CameraBox` | Camera capture widget built on `expo-camera`; returns a base64-encoded photo |

---

## State Management

All authentication state, trip data, and API calls are centralised in **`AuthContext`** (`src/context/AuthContext.tsx`).

### Exposed context methods

| Method | Role | Description |
|---|---|---|
| `login(email, password)` | All | Authenticate via Supabase |
| `signUp(fullName, email, password)` | All | Register a new account |
| `logout()` | All | Sign out and clear session |
| `checkInLorry(...)` | Quarry | POST a new check-in to the server |
| `checkOutLorry(id, data)` | Quarry | POST a check-out with material details |
| `getQuarryQueue()` | Quarry | Returns current `INSIDE_QUARRY` list |
| `fetchIncomingFleet()` | Unload | Fetches `IN_TRANSIT` lorries from the server |
| `getIncomingFleet()` | Unload | Returns cached transit fleet |
| `verifyAndCloseTrip(id, data)` | Unload | POST unload verification and close the trip |
| `getCompletedArchives()` | Shared | Returns `UNLOADED` trip history |

---

## Vehicle Check-In Validation

- Transporter name: required, non-blank
- Vehicle number: required, alphanumeric + hyphens, 4–15 characters (`/^[A-Z0-9-]{4,15}$/i`)
- Entry date: required (`YYYY-MM-DD`)
- Entry time: required (`HH:MM`, 24-hour)

---

## Project Structure

```
SM-Client/
├── App.tsx                       # Root component — auth gate, role routing, header
├── index.ts                      # Expo entry point
├── assets/                       # App icons and splash images
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── CameraBox.tsx
│   │       └── Input.tsx
│   ├── context/
│   │   └── AuthContext.tsx       # Global auth + trip state
│   ├── lib/
│   │   ├── api.ts                # SM-Server API client + URL resolution
│   │   └── supabase.ts           # Supabase client initialisation
│   └── screens/
│       ├── auth/
│       │   ├── LoginScreen.tsx
│       │   └── SignupScreen.tsx
│       ├── quarry/
│       │   ├── CheckInScreen.tsx
│       │   └── QuarryQueueScreen.tsx
│       └── unload/
│           └── IncomingFleetScreen.tsx
├── app.json                      # Expo app configuration
├── package.json
└── tsconfig.json
```
