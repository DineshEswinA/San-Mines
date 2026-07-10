# SM-Server — Q-Track API

Backend REST API for the San Mines lorry tracking system. Built with **Express.js** and **TypeScript**, backed by **Supabase** for authentication and data persistence.

---

## Overview

SM-Server manages the full lifecycle of a mining lorry trip — from quarry check-in through transit to unload-point verification. It enforces role-based access control, geofence validation, and structured trip state transitions.

### Trip State Machine

```
INSIDE_QUARRY → IN_TRANSIT → UNLOADED
```

| State | Triggered by |
|---|---|
| `INSIDE_QUARRY` | Quarry Operator checks in a lorry |
| `IN_TRANSIT` | Quarry Operator checks out a lorry with material details |
| `UNLOADED` | Unload Operator verifies and closes the trip |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Language | TypeScript |
| Auth & DB | Supabase |
| Dev server | ts-node-dev |

---

## Prerequisites

- Node.js 18+
- A Supabase project with a `trips` and `profiles` table
- `.env` file (see Configuration)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server with hot-reload
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

The server listens on `http://localhost:3000` by default.

---

## Configuration

Create a `.env` file in the project root:

```env
PORT=3000

# Supabase
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Geofence — Quarry site coordinates
QUARRY_LAT=40.7128
QUARRY_LNG=-74.0060

# Geofence — Unload site coordinates
UNLOAD_LAT=34.0522
UNLOAD_LNG=-118.2437

# Maximum allowed radius from a site for geofence validation (metres)
ALLOWED_RADIUS_METERS=100
```

---

## API Reference

All API routes are mounted under `/api`.

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Returns server uptime and status |

### Utilities

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/distance` | None | Calculates distance in metres between two GPS coordinates using the Haversine formula |

**`POST /api/distance` body:**
```json
{ "lat1": 19.076, "lon1": 72.877, "lat2": 18.520, "lon2": 73.856 }
```

### Auth-Protected

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/profile` | Bearer JWT | Returns the authenticated user's profile |
| `GET` | `/api/admin` | Bearer JWT + `admin` role | Admin-only portal |

### Trips

All trip routes require a valid Bearer JWT and the appropriate role.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/trips/checkin` | `QUARRY_OPERATOR` | Register a lorry entering the quarry |
| `POST` | `/api/trips/checkout/:id` | `QUARRY_OPERATOR` | Record lorry exit with material and transit details |
| `GET` | `/api/trips/queue` | `QUARRY_OPERATOR` | Fetch all lorries currently inside the quarry |
| `GET` | `/api/trips/fleet` | `UNLOAD_OPERATOR` | Fetch all lorries currently in transit |
| `POST` | `/api/trips/verify/:id` | `UNLOAD_OPERATOR` | Verify arrival and close out a trip |

**`POST /api/trips/checkin` body:**
```json
{
  "vehicleNumber": "MH-12-PQ-9876",
  "transporterName": "Delta Logistics",
  "checkinTime": "2026-07-05T08:30:00.000Z"
}
```

---

## Roles

| Role | Description |
|---|---|
| `QUARRY_OPERATOR` | Manages lorry check-in and check-out at the quarry site |
| `UNLOAD_OPERATOR` | Verifies lorry arrival and material unloading at the destination |
| `admin` | Full administrative access |

### Mock Tokens (Development)

Two static tokens bypass Supabase auth for local testing:

| Token | Role |
|---|---|
| `mock-quarry-operator` | `QUARRY_OPERATOR` |
| `mock-unload-operator` | `UNLOAD_OPERATOR` |

```bash
curl -H "Authorization: Bearer mock-quarry-operator" http://localhost:3000/api/profile
```

---

## Supported Materials & Tyre Configs

**Materials (`material` field):**
`river_sand`, `rough_gravel`, `pure_gravel`, `10mm_road_metal`, `20mm_road_metal`, `msand`

**Tyre counts (`tyres` field):**
`10`, `12`, `14`, `16`, `18`

---

## Project Structure

```
SM-Server/
├── src/
│   ├── server.ts          # Express app entry point
│   ├── config/
│   │   └── supabase.ts    # Supabase client initialisation
│   ├── middleware/
│   │   └── auth.ts        # JWT auth + role authorisation middleware
│   ├── routes/
│   │   ├── index.ts       # Root API router (health, distance, profile, admin)
│   │   └── trips.ts       # Trip lifecycle routes
│   └── utils/
│       ├── geo.ts          # Haversine distance calculation
│       └── mapper.ts       # DB ↔ client field mapping
├── package.json
└── tsconfig.json
```
