# San Mines Server Backend - AI Knowledge Guide

This document defines the architecture, database schema, middleware filters, endpoint contracts, and deployment conventions of the Express/Node.js server application (`SM-Server`). It serves as a repository guide for AI agents.

---

## 1. Technical Stack & Dependencies
- **Core Framework**: Node.js with Express (5.x.x)
- **Language**: TypeScript
- **Database**: Supabase PostgreSQL DB and Supabase Client JS (`@supabase/supabase-js`)
- **Authentication**: JWT token verification (`jsonwebtoken`)
- **Environment config**: `dotenv`
- **CORS**: Enabled globally via `cors`

---

## 2. Directory Structure
```
SM-Server/
├── dist/                   # Transpiled production JS files
├── schema.sql              # Database schema definition, enums, registries, and RLS policies
├── src/
│   ├── config/             # Supabase JS configuration client
│   ├── middleware/
│   │   ├── auth.ts         # requireAuth and authorizeRole middleware layers
│   │   └── requestLogger.ts# rotatable file logger and server audit manager
│   ├── routes/
│   │   ├── index.ts        # Primary routing gateway and health endpoints
│   │   └── trips.ts        # Registry lookups and transaction stage endpoints
│   ├── server.ts           # Server initialization and listener port config
│   └── utils/
│       ├── geo.ts          # Haversine distance calculator for geofencing checks
│       └── mapper.ts       # Maps database snake_case keys to client camelCase keys
├── tsconfig.json           # TypeScript configuration
└── package.json            # Target versions and NPM run scripts
```

---

## 3. Database Schema Overview (`schema.sql`)
The PostgreSQL database runs under Row Level Security (RLS) policies configured for application profiles.

### Tables & Enums
1. **`user_role` Enum**:
   `CREATE TYPE user_role AS ENUM ('QUARRY_OPERATOR', 'UNLOAD_OPERATOR', 'SUPER_ADMIN');`
2. **`profiles` Table**:
   Stores application users linked to Supabase Auth (`auth.users`).
3. **`locations` Table**:
   Tracks configuration locations (`latitude`, `longitude`, `allowed_radius_meters`) flagged as either `'QUARRY'` or `'UNLOAD_SITE'`.
4. **`trips` Table**:
   Logs the lifecycle of a vehicle transaction:
   - **Phase 1 (Inbound Entry)**: status = `'INSIDE_QUARRY'`. Logs entry timestamps and operator references.
   - **Phase 2 (Outbound Check-out)**: status = `'IN_TRANSIT'`. Records transit types, weights, locations, materials, tyre count, and photos.
   - **Phase 3 (Yard Arrival & Unload)**: status = `'UNLOADED'`. Records unload timestamps, target site references, and unloading operator IDs.

---

## 4. Middlewares (`src/middleware/`)

### `requireAuth`
- Extracts the HTTP standard `Bearer <token>` from the request `Authorization` header.
- Decodes and verifies it using the Supabase JWT secret.
- **Offline Mock Tokens**: Resolves mock header tokens `mock-quarry-operator` and `mock-unload-operator` for local testing/development bypass.
- Attaches the parsed user object `{ id, email, role }` to `req.user`.

### `authorizeRole(allowedRoles: string[])`
- Rejects requests with a `403 Forbidden` error if the authenticated user's role is not included in the specified list of allowed roles.

---

## 5. REST API Routes (`src/routes/trips.ts`)

| HTTP Method | Route Endpoint | Middleware Check | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/config/materials` | `requireAuth` | Retrieves active materials registries |
| **GET** | `/api/config/wheel-types` | `requireAuth` | Retrieves active tyre counts registries |
| **GET** | `/api/config/locations` | `requireAuth` | Retrieves quarries and unload yard sites |
| **POST** | `/api/trips/checkin` | `authorizeRole(['QUARRY_OPERATOR', 'SUPER_ADMIN'])` | Creates a new trip log with status `'INSIDE_QUARRY'` |
| **PUT** | `/api/trips/checkout/:id` | `authorizeRole(['QUARRY_OPERATOR', 'SUPER_ADMIN'])` | Performs geofencing and sets status to `'IN_TRANSIT'` |
| **GET** | `/api/trips/incoming` | `authorizeRole(['UNLOAD_OPERATOR', 'SUPER_ADMIN'])` | Lists all active vehicles on the road |
| **PUT** | `/api/trips/unload/:id` | `authorizeRole(['UNLOAD_OPERATOR', 'SUPER_ADMIN'])` | Closes transactions, setting status to `'UNLOADED'` |
| **GET** | `/api/trips` | `requireAuth` | Lists trips filtered dynamically based on operator context |
| **GET** | `/api/admin` | `authorizeRole(['SUPER_ADMIN'])` | Administrative control portal gateway |
