# San Mines Logistics & Dispatch Platform — API Reference Documentation

This document provides a comprehensive specification of the REST API endpoints exposed by the backend server (`SM-Server`) for the **San Mines Material Logistics and Fleet Tracking Platform**.

---

## Global API Information

* **Base URL**: `http://localhost:3000/api` (for local development) or `http://<YOUR_SERVER_IP>:3000/api`
* **Content Type**: `application/json` for all requests with bodies.
* **Authentication**: Token-based authentication using **Supabase JWTs**. 
  * All protected endpoints require a `Authorization` header with the format: `Bearer <JWT_TOKEN>`.
  * For local offline testing, two mock authorization bypass tokens are supported:
    * `mock-quarry-operator` (resolves as user with `QUARRY_OPERATOR` role)
    * `mock-unload-operator` (resolves as user with `UNLOAD_OPERATOR` role)
* **Access Roles**:
  * `SUPER_ADMIN`: Administrative credentials allowing configuration management and user access control.
  * `QUARRY_OPERATOR`: Quarry operator credentials allowing inbound entry logging and outbound checkout validations.
  * `UNLOAD_OPERATOR`: Destination operator credentials allowing inbound transit log queries and close-out unloading.

---

## 1. System & Utilities

### Health Check
Retrieves the system status, uptime, and current server time.

* **HTTP Method**: `GET`
* **Route**: `/health` (Full URL: `/api/health`)
* **Authorization**: Public
* **Query Parameters**: None
* **Request Body**: None
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "status": "OK",
      "uptime": 123.456,
      "timestamp": "2026-07-27T14:34:11.000Z"
    }
    ```

---

### Distance Calculator
Calculates the physical distance in meters between two GPS coordinate points using the **Haversine formula**.

* **HTTP Method**: `POST`
* **Route**: `/distance` (Full URL: `/api/distance`)
* **Authorization**: Public
* **Request Body**:
  ```json
  {
    "lat1": 13.082700,
    "lon1": 80.270700,
    "lat2": 12.971600,
    "lon2": 77.594600
  }
  ```
* **Validation Rules**:
  * `lat1`, `lon1`, `lat2`, and `lon2` are all required and must be valid numbers.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "distanceMeters": 290123.45,
      "coordinates": {
        "point1": { "lat": 13.0827, "lon": 80.2707 },
        "point2": { "lat": 12.9716, "lon": 77.5946 }
      }
    }
    ```
  * **Error (400 Bad Request)**: Coordinates are missing or invalid.
    ```json
    {
      "error": "Bad Request",
      "message": "Coordinates lat1, lon1, lat2, and lon2 must be valid numbers."
    }
    ```

---

## 2. Authentication & User Profile Management

### User Profile
Retrieves user metadata for the currently authenticated token.

* **HTTP Method**: `GET`
* **Route**: `/profile` (Full URL: `/api/profile`)
* **Authorization**: Authenticated (`SUPER_ADMIN` | `QUARRY_OPERATOR` | `UNLOAD_OPERATOR`)
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**: None
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "message": "Authorized access to profile metadata successful.",
      "user": {
        "id": "2390ec96-2244-42f0-a681-420ef1e83c27",
        "email": "quarry.operator@sanmines.com",
        "role": "QUARRY_OPERATOR"
      }
    }
    ```

---

### Admin Portal Verification
A simple authorization gate check to verify that a token has administrator-level capabilities.

* **HTTP Method**: `GET`
* **Route**: `/admin` (Full URL: `/api/admin`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**: None
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "message": "Welcome to the administrative portal.",
      "user": {
        "id": "e8d64117-9154-4fa0-be9c-70364d9fbba3",
        "email": "admin@sanmines.com",
        "role": "SUPER_ADMIN"
      }
    }
    ```
  * **Error (403 Forbidden)**: Authenticated user is not an administrator.
    ```json
    {
      "error": "Forbidden",
      "message": "Access Denied: Action requires SUPER_ADMIN privileges."
    }
    ```

---

### Get Staff Profiles
Retrieves a list of all user profiles registered in the system database.

* **HTTP Method**: `GET`
* **Route**: `/users` (Full URL: `/api/users`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**: None
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    [
      {
        "id": "2390ec96-2244-42f0-a681-420ef1e83c27",
        "email": "quarry.operator@sanmines.com",
        "role": "QUARRY_OPERATOR",
        "full_name": "John Quarry Operator",
        "created_at": "2026-07-26T18:00:00.000Z"
      },
      {
        "id": "e8d64117-9154-4fa0-be9c-70364d9fbba3",
        "email": "admin@sanmines.com",
        "role": "SUPER_ADMIN",
        "full_name": "System Administrator",
        "created_at": "2026-07-25T12:00:00.000Z"
      }
    ]
    ```

---

### Register New Operator
Creates a new login user account bypassing email confirmation requirements, and records the profile database row.

* **HTTP Method**: `POST`
* **Route**: `/users` (Full URL: `/api/users`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "email": "new.operator@sanmines.com",
    "password": "SecurePassword123",
    "role": "QUARRY_OPERATOR",
    "full_name": "New Operator Name"
  }
  ```
* **Validation Rules**:
  * `email`, `password`, `role`, and `full_name` are required.
  * `role` must be one of: `QUARRY_OPERATOR`, `UNLOAD_OPERATOR`, or `SUPER_ADMIN`.
* **Response Details**:
  * **Success (201 Created)**:
    ```json
    {
      "message": "User created successfully.",
      "user": {
        "id": "bfd605c4-42ff-4b13-a44f-f2fb1f6920d3",
        "email": "new.operator@sanmines.com",
        "role": "QUARRY_OPERATOR",
        "full_name": "New Operator Name"
      }
    }
    ```
  * **Error (400 Bad Request)**: Missing fields or invalid role value.
  * **Error (500 Internal Server Error / DB error)**: Rolled back if user registration fails.

---

### Alter Worker Access Role
Modifies the role attribute of an existing user profile and updates their Supabase auth metadata properties accordingly.

* **HTTP Method**: `PATCH`
* **Route**: `/users/:id/role` (Full URL: `/api/users/bfd605c4-42ff-4b13-a44f-f2fb1f6920d3/role`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Headers**: `Authorization: Bearer <token>`
* **Path Parameters**:
  * `id`: The UUID of the user to update.
* **Request Body**:
  ```json
  {
    "role": "UNLOAD_OPERATOR"
  }
  ```
* **Validation Rules**:
  * `role` must be one of: `QUARRY_OPERATOR`, `UNLOAD_OPERATOR`, or `SUPER_ADMIN`.
  * Cannot downgrade the last remaining `SUPER_ADMIN` user in the database.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "message": "Successfully updated user role to UNLOAD_OPERATOR",
      "profile": {
        "id": "bfd605c4-42ff-4b13-a44f-f2fb1f6920d3",
        "email": "new.operator@sanmines.com",
        "role": "UNLOAD_OPERATOR",
        "full_name": "New Operator Name",
        "created_at": "2026-07-27T10:00:00.000Z"
      }
    }
    ```
  * **Error (400 Bad Request)**: Downgrading the last Admin, or invalid role value.
  * **Error (404 Not Found)**: Profile ID not found.

---

## 3. Master Configurations Layer

### 3.1 Wheel Configurations

#### Get Wheel Types
* **HTTP Method**: `GET`
* **Route**: `/config/wheel-types` (Full URL: `/api/config/wheel-types`)
* **Authorization**: Authenticated (`SUPER_ADMIN` | `QUARRY_OPERATOR` | `UNLOAD_OPERATOR`)
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "wheel_count": 10,
        "display_label": "10",
        "is_active": true,
        "created_at": "2026-07-27T09:05:00.000Z"
      }
    ]
    ```

#### Create Wheel Type
* **HTTP Method**: `POST`
* **Route**: `/config/wheel-types` (Full URL: `/api/config/wheel-types`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Request Body**:
  ```json
  {
    "wheel_count": 12,
    "display_label": "12"
  }
  ```
* **Response Details**:
  * **Success (201 Created)**: Returns the created config record object.

#### Edit Wheel Type
* **HTTP Method**: `PUT`
* **Route**: `/config/wheel-types/:id` (Full URL: `/api/config/wheel-types/1`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Path Parameters**:
  * `id`: The sequential configuration record ID.
* **Request Body** (at least one parameter required):
  ```json
  {
    "is_active": false,
    "wheel_count": 12,
    "display_label": "12-Wheeler Heavy"
  }
  ```
* **Response Details**:
  * **Success (200 OK)**: Returns the updated config record object.

#### Delete Wheel Type
* **HTTP Method**: `DELETE`
* **Route**: `/config/wheel-types/:id` (Full URL: `/api/config/wheel-types/1`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Path Parameters**:
  * `id`: The sequential configuration record ID.
* **Validation Rules**:
  * Will reject with a `409 Conflict` error if the wheel type configuration is referenced by any active or historic fleet trips in the transaction database.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    { "message": "Wheel type configuration deleted successfully." }
    ```
  * **Error (409 Conflict)**: Reference exists.

---

### 3.2 Aggregate Materials

#### Get Materials
* **HTTP Method**: `GET`
* **Route**: `/config/materials` (Full URL: `/api/config/materials`)
* **Authorization**: Authenticated
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "material_name": "river_sand",
        "display_name": "River Sand",
        "is_active": true,
        "created_at": "2026-07-27T09:05:00.000Z"
      }
    ]
    ```

#### Create Material
* **HTTP Method**: `POST`
* **Route**: `/config/materials` (Full URL: `/api/config/materials`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Request Body**:
  ```json
  {
    "material_name": "blue_metal_40mm",
    "display_name": "Blue Metal 40mm"
  }
  ```
* **Response Details**:
  * **Success (201 Created)**: Returns the created material object.

#### Edit Material
* **HTTP Method**: `PUT`
* **Route**: `/config/materials/:id` (Full URL: `/api/config/materials/1`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Path Parameters**:
  * `id`: The material configuration record ID.
* **Request Body**:
  ```json
  {
    "material_name": "blue_metal_40mm_v2",
    "display_name": "Blue Metal 40mm Premium",
    "is_active": true
  }
  ```
* **Response Details**:
  * **Success (200 OK)**: Returns the updated material object.

#### Delete Material
* **HTTP Method**: `DELETE`
* **Route**: `/config/materials/:id` (Full URL: `/api/config/materials/1`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Path Parameters**:
  * `id`: The material configuration record ID.
* **Validation Rules**:
  * Fails with a `409 Conflict` error if any active or historical trip rows reference this material chip ID.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    { "message": "Material chip deleted successfully." }
    ```

---

### 3.3 Location Nodes

#### Get Locations
* **HTTP Method**: `GET`
* **Route**: `/config/locations` (Full URL: `/api/config/locations`)
* **Authorization**: Authenticated
* **Query Parameters**:
  * `type` (optional): Filter locations by node type. Acceptable values: `QUARRY`, `UNLOAD_SITE`.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "name": "Quarry Base Alpha",
        "node_type": "QUARRY",
        "latitude": 13.082700,
        "longitude": 80.270700,
        "allowed_radius_meters": 150,
        "is_active": true,
        "created_at": "2026-07-27T09:05:00.000Z"
      }
    ]
    ```

#### Create Location Node
* **HTTP Method**: `POST`
* **Route**: `/config/locations` (Full URL: `/api/config/locations`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Request Body**:
  ```json
  {
    "name": "Quarry Gamma Yard",
    "node_type": "QUARRY",
    "latitude": 13.090000,
    "longitude": 80.280000,
    "allowed_radius_meters": 120
  }
  ```
* **Validation Rules**:
  * `name`, `node_type`, `latitude`, and `longitude` are required.
  * `node_type` must be either `QUARRY` or `UNLOAD_SITE`.
  * `allowed_radius_meters` defaults to 100 if omitted.
* **Response Details**:
  * **Success (201 Created)**: Returns the newly created location node record.

#### Edit Location Node
* **HTTP Method**: `PUT`
* **Route**: `/config/locations/:id` (Full URL: `/api/config/locations/1`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Path Parameters**:
  * `id`: The sequential location record ID.
* **Request Body**:
  ```json
  {
    "name": "Quarry Gamma Yard Updated",
    "node_type": "QUARRY",
    "latitude": 13.090000,
    "longitude": 80.280000,
    "allowed_radius_meters": 150,
    "is_active": true
  }
  ```
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "message": "Location node updated successfully.",
      "location": {
        "id": 1,
        "name": "Quarry Gamma Yard Updated",
        "node_type": "QUARRY",
        "latitude": 13.090000,
        "longitude": 80.280000,
        "allowed_radius_meters": 150,
        "is_active": true,
        "created_at": "2026-07-27T09:05:00.000Z"
      }
    }
    ```

#### Delete Location Node
* **HTTP Method**: `DELETE`
* **Route**: `/config/locations/:id` (Full URL: `/api/config/locations/1`)
* **Authorization**: Restricted to `SUPER_ADMIN`
* **Path Parameters**:
  * `id`: The sequential location record ID.
* **Validation Rules**:
  * Rejects with a `409 Conflict` error if the node ID is mapped to any trips as either a `dispatch_location_id` or an `unloading_location_id`.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    { "message": "Location node deleted successfully." }
    ```

---

## 4. Trip Transactions Pipeline

```
   [ Check-in ]              [ Check-out ]              [ Unload ]
  INSIDE_QUARRY    ───>       IN_TRANSIT       ───>      UNLOADED
(Quarry Entry Logs)       (Geofence & Weight)       (Geofence closeout)
```

### Get Trips Ledger
Retrieves a filtered list of trips depending on the active operator's context or status filters.

* **HTTP Method**: `GET`
* **Route**: `/trips` (Full URL: `/api/trips`)
* **Authorization**: Authenticated (`SUPER_ADMIN` | `QUARRY_OPERATOR` | `UNLOAD_OPERATOR`)
* **Query Parameters**:
  * `status` (optional): Filter explicitly by trip state. Valid values: `INSIDE_QUARRY`, `IN_TRANSIT`, `UNLOADED`.
* **Behavior Defaults (If `status` query is not supplied)**:
  * For `QUARRY_OPERATOR`: Defaults to only fetch trips with status `'INSIDE_QUARRY'`.
  * For `UNLOAD_OPERATOR`: Defaults to fetch trips with status `'IN_TRANSIT'` or `'UNLOADED'`.
  * For `SUPER_ADMIN`: Fetches all trips.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "trips": [
        {
          "id": 12,
          "status": "INSIDE_QUARRY",
          "vehicleNumber": "KA-01-ME-1234",
          "transporterName": "VRL Logistics",
          "quarryEntryTime": "2026-07-27T10:00:00.000Z",
          "quarryEntryDate": "2026-07-27",
          "quarryOperatorId": "2390ec96-2244-42f0-a681-420ef1e83c27",
          "createdAt": "2026-07-27T10:00:00.000Z",
          "updatedAt": "2026-07-27T10:00:00.000Z"
        }
      ],
      "total": 1
    }
    ```

---

### Phase 1: Post Check-in (Inbound Entry)
Logs a newly arrived vehicle into the quarry queue database. Sets the initial trip status to `'INSIDE_QUARRY'`.

* **HTTP Method**: `POST`
* **Route**: `/trips/checkin` (Full URL: `/api/trips/checkin`)
* **Authorization**: Restricted to `QUARRY_OPERATOR` or `SUPER_ADMIN`
* **Request Body**:
  ```json
  {
    "vehicleNumber": "KA-01-ME-1234",
    "transporterName": "VRL Logistics",
    "quarryEntryTime": "10:00:00",  // optional: full ISO format or HH:MM:SS
    "quarryEntryDate": "2026-07-27" // optional: YYYY-MM-DD
  }
  ```
* **Validation Rules**:
  * `vehicleNumber` is required and cannot be blank.
  * `transporterName` is required and cannot be blank.
  * Timestamps default to the current system time (`now()`) if omitted.
* **Response Details**:
  * **Success (201 Created)**:
    ```json
    {
      "message": "Check-in successful.",
      "trip_id": 12,
      "trip": {
        "id": 12,
        "status": "INSIDE_QUARRY",
        "vehicleNumber": "KA-01-ME-1234",
        "transporterName": "VRL Logistics",
        "quarryEntryTime": "2026-07-27T10:00:00.000Z",
        "quarryEntryDate": "2026-07-27",
        "quarryOperatorId": "2390ec96-2244-42f0-a681-420ef1e83c27"
      }
    }
    ```
  * **Error (400 Bad Request)**: Vehicle number or transporter name missing.

---

### Phase 2: Put Checkout (Outbound Dispatch & Geofencing)
Applies outbound quarry weights, validates geofencing parameters, and moves the vehicle status to `'IN_TRANSIT'`.

* **HTTP Method**: `PUT`
* **Route**: `/trips/checkout/:id` (Full URL: `/api/trips/checkout/12`)
* **Authorization**: Restricted to `QUARRY_OPERATOR` or `SUPER_ADMIN`
* **Path Parameters**:
  * `id`: The sequential ID of the active `'INSIDE_QUARRY'` trip.
* **Request Body**:
  ```json
  {
    "transitType": "DIGITAL",
    "govtStationaryNumber": "STATION123",
    "dispatchLocationId": 1,
    "materialId": 1,
    "wheelTypeId": 1,
    "netWeightTonne": 25.5,
    "amountEntry": 1500,
    "userLat": 13.082700,
    "userLng": 80.270700,
    "quarryExitTime": "10:30:00",
    "transitFormPhotoUrl": "https://storage.supabase.co/.../form.jpg",
    "vehiclePhotoUrl": "https://storage.supabase.co/.../truck.jpg"
  }
  ```
* **Validation Rules**:
  * `transitType` is required and must be either `DIGITAL` or `MANUAL`.
  * **Digital Pass Rule**: If `transitType` is `DIGITAL`, `govtStationaryNumber` is strictly required, cannot be blank, must be 4–50 characters, and must match `/^[A-Z0-9\-\/ ]{4,50}$/i` (alphanumeric, spaces, hyphens, slashes).
  * `dispatchLocationId`, `materialId`, and `wheelTypeId` must be valid configuration IDs.
  * The location referenced by `dispatchLocationId` must have `node_type = 'QUARRY'`.
  * `netWeightTonne` must be a positive number.
  * `userLat` and `userLng` are required numbers representing the operator's current location.
  * **Geofence Rule**: The distance between `(userLat, userLng)` and the Quarry coordinates is calculated using the **Haversine formula**. If this distance exceeds the location's `allowed_radius_meters`, the check-out is rejected with a `403 Forbidden` response.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "message": "Checkout successful. Vehicle is now in transit.",
      "trip": {
        "id": 12,
        "status": "IN_TRANSIT",
        "vehicleNumber": "KA-01-ME-1234",
        "transporterName": "VRL Logistics",
        "transitType": "DIGITAL",
        "govtStationaryNumber": "STATION123",
        "dispatchLocationId": 1,
        "materialId": 1,
        "wheelTypeId": 1,
        "netWeightTonne": 25.5,
        "amountEntry": 1500,
        "quarryGpsLat": 13.0827,
        "quarryGpsLong": 80.2707,
        "quarryExitTime": "2026-07-27T10:30:00.000Z",
        "transitFormPhotoUrl": "https://storage.supabase.co/.../form.jpg",
        "vehiclePhotoUrl": "https://storage.supabase.co/.../truck.jpg"
      }
    }
    ```
  * **Error (400 Bad Request)**: Invalid fields, negative net weight, or checkout on a trip that is not in `INSIDE_QUARRY` status.
  * **Error (403 Forbidden - Geofence)**: Driver is outside of the geofenced area.
    ```json
    {
      "error": "Forbidden",
      "message": "Geofence violation: Distance from quarry is 185.20m, which exceeds the allowed radius of 150m."
    }
    ```
  * **Error (404 Not Found)**: Trip ID or Dispatch Location ID not found.

---

### Get Incoming Transit Logs
Lists all fleet vehicles currently in transit (status is `'IN_TRANSIT'`).

* **HTTP Method**: `GET`
* **Route**: `/trips/incoming` (Full URL: `/api/trips/incoming`)
* **Authorization**: Restricted to `UNLOAD_OPERATOR` or `SUPER_ADMIN`
* **Response Details**:
  * **Success (200 OK)**: Returns an array of trip objects in `IN_TRANSIT` status.
    ```json
    [
      {
        "id": 12,
        "status": "IN_TRANSIT",
        "vehicleNumber": "KA-01-ME-1234",
        "transporterName": "VRL Logistics",
        ...
      }
    ]
    ```

---

### Phase 3: Put Unload (Arrival Close-out & Geofencing)
Logs arrival at the unload destination node, validates geofencing parameters, and marks the trip status as `'UNLOADED'`, completing the transaction lifecycle.

* **HTTP Method**: `PUT`
* **Route**: `/trips/unload/:id` (Full URL: `/api/trips/unload/12`)
* **Authorization**: Restricted to `UNLOAD_OPERATOR` or `SUPER_ADMIN`
* **Path Parameters**:
  * `id`: The sequential ID of the active `'IN_TRANSIT'` trip.
* **Request Body**:
  ```json
  {
    "unloadingLocationId": 3,
    "userLat": 12.971600,
    "userLng": 77.594600,
    "unloadEntryTime": "15:00:00",
    "unloadExitTime": "15:20:00",
    "unloadDate": "2026-07-27",
    "unloadingPhotoUrl": "https://storage.supabase.co/.../unload_proof.jpg"
  }
  ```
* **Validation Rules**:
  * `unloadingLocationId` is required and must reference a location with `node_type = 'UNLOAD_SITE'`.
  * `userLat` and `userLng` are required numbers representing the operator's current location.
  * **Geofence Rule**: The distance between `(userLat, userLng)` and the Unload Site coordinates is calculated using the **Haversine formula**. If this distance exceeds the destination site's `allowed_radius_meters`, the close-out is rejected with a `403 Forbidden` response.
  * Timestamps default to the current system time (`now()`) if omitted.
* **Response Details**:
  * **Success (200 OK)**:
    ```json
    {
      "message": "Trip successfully unloaded. Pipeline completed.",
      "trip": {
        "id": 12,
        "status": "UNLOADED",
        "vehicleNumber": "KA-01-ME-1234",
        "unloadingLocationId": 3,
        "unloadGpsLat": 12.9716,
        "unloadGpsLong": 77.5946,
        "unloadEntryTime": "2026-07-27T15:00:00.000Z",
        "unloadExitTime": "2026-07-27T15:20:00.000Z",
        "unloadDate": "2026-07-27",
        "unloadOperatorId": "bfd605c4-42ff-4b13-a44f-f2fb1f6920d3",
        "unloadingPhotoUrl": "https://storage.supabase.co/.../unload_proof.jpg",
        "updatedAt": "2026-07-27T15:20:00.000Z"
      }
    }
    ```
  * **Error (400 Bad Request)**: Invalid fields or unloading a trip that is not in `IN_TRANSIT` status.
  * **Error (403 Forbidden - Geofence)**: Driver is outside of the geofenced unload site.
  * **Error (404 Not Found)**: Trip ID or Unload Location ID not found.

---

## 5. Client Database Object Mapping (Key Conversions)

The Express backend automatically maps snake_case database schema fields to camelCase client keys (`src/utils/mapper.ts`).

| Database Schema Key (`snake_case`) | Client DTO Key (`camelCase`) |
| :--- | :--- |
| `vehicle_number` | `vehicleNumber` |
| `transporter_name` | `transporterName` |
| `quarry_entry_time` | `quarryEntryTime` |
| `quarry_entry_date` | `quarryEntryDate` |
| `quarry_operator_id` | `quarryOperatorId` |
| `quarry_exit_time` | `quarryExitTime` |
| `transit_type` | `transitType` |
| `govt_stationary_number` | `govtStationaryNumber` |
| `dispatch_location_id` | `dispatchLocationId` |
| `material_id` | `materialId` |
| `wheel_type_id` | `wheelTypeId` |
| `net_weight_tonne` | `netWeightTonne` |
| `amount_entry` | `amountEntry` |
| `transit_form_photo_url` | `transitFormPhotoUrl` |
| `vehicle_photo_url` | `vehiclePhotoUrl` |
| `quarry_gps_lat` | `quarryGpsLat` |
| `quarry_gps_long` | `quarryGpsLong` |
| `unload_entry_time` | `unloadEntryTime` |
| `unload_exit_time` | `unloadExitTime` |
| `unload_date` | `unloadDate` |
| `unloading_location_id` | `unloadingLocationId` |
| `unloading_photo_url` | `unloadingPhotoUrl` |
| `unload_gps_lat` | `unloadGpsLat` |
| `unload_gps_long` | `unloadGpsLong` |
| `unload_operator_id` | `unloadOperatorId` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
