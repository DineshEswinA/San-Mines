# Sam Mines — Simple API List & Sample Payloads

Below is a simplified list of all REST API endpoints. For write requests (`POST`, `PUT`, `PATCH`), sample payloads are provided.

---

## Authentication

All protected endpoints require an authentication header containing a valid **Supabase JWT Token**.

* **Header Format**: `Authorization: Bearer <JWT_TOKEN>`
* **Offline Mock Bypass Tokens (For Local Sandbox Development)**:
  * `mock-quarry-operator` — Automatically resolves with the role `QUARRY_OPERATOR`.
  * `mock-unload-operator` — Automatically resolves with the role `UNLOAD_OPERATOR`.

---

## 1. System & Utilities

### Health Check
* **Method**: `GET`
* **Route**: `/api/health`
* **Payload**: None (Returns system uptime/status)

### Distance Calculator
* **Method**: `POST`
* **Route**: `/api/distance`
* **Sample Payload**:
  ```json
  {
    "lat1": 13.0827,
    "lon1": 80.2707,
    "lat2": 12.9716,
    "lon2": 77.5946
  }
  ```

---

## 2. Authentication & Profile

### User Profile
* **Method**: `GET`
* **Route**: `/api/profile`
* **Payload**: None

### Admin Portal Verification Check
* **Method**: `GET`
* **Route**: `/api/admin`
* **Payload**: None

### Get Staff Profiles
* **Method**: `GET`
* **Route**: `/api/users`
* **Payload**: None

### Register New Operator
* **Method**: `POST`
* **Route**: `/api/users`
* **Sample Payload**:
  ```json
  {
    "email": "operator@sanmines.com",
    "password": "password123",
    "role": "QUARRY_OPERATOR",
    "full_name": "Test Operator"
  }
  ```

### Alter Worker Access Role
* **Method**: `PATCH`
* **Route**: `/api/users/:id/role`
* **Sample Payload**:
  ```json
  {
    "role": "UNLOAD_OPERATOR"
  }
  ```

---

## 3. Master Configurations Layer

### Get Wheel Types
* **Method**: `GET`
* **Route**: `/api/config/wheel-types`
* **Payload**: None

### Create Wheel Type
* **Method**: `POST`
* **Route**: `/api/config/wheel-types`
* **Sample Payload**:
  ```json
  {
    "wheel_count": 12,
    "display_label": "12"
  }
  ```

### Edit Wheel Type
* **Method**: `PUT`
* **Route**: `/api/config/wheel-types/:id`
* **Sample Payload**:
  ```json
  {
    "is_active": false,
    "wheel_count": 10,
    "display_label": "10-Wheeler"
  }
  ```

### Delete Wheel Type
* **Method**: `DELETE`
* **Route**: `/api/config/wheel-types/:id`
* **Payload**: None

### Get Materials
* **Method**: `GET`
* **Route**: `/api/config/materials`
* **Payload**: None

### Create Material
* **Method**: `POST`
* **Route**: `/api/config/materials`
* **Sample Payload**:
  ```json
  {
    "material_name": "blue_metal_40mm",
    "display_name": "Blue Metal 40mm"
  }
  ```

### Edit Material
* **Method**: `PUT`
* **Route**: `/api/config/materials/:id`
* **Sample Payload**:
  ```json
  {
    "material_name": "rough_gravel_v2",
    "display_name": "Rough Gravel Premium",
    "is_active": true
  }
  ```

### Delete Material
* **Method**: `DELETE`
* **Route**: `/api/config/materials/:id`
* **Payload**: None

### Get Locations
* **Method**: `GET`
* **Route**: `/api/config/locations`
* **Payload**: None (Supports optional query parameter: `?type=QUARRY` or `?type=UNLOAD_SITE`)

### Create Location Node
* **Method**: `POST`
* **Route**: `/api/config/locations`
* **Sample Payload**:
  ```json
  {
    "name": "Quarry Gamma Yard",
    "node_type": "QUARRY",
    "latitude": 13.090000,
    "longitude": 80.280000,
    "allowed_radius_meters": 120
  }
  ```

### Edit Location Node
* **Method**: `PUT`
* **Route**: `/api/config/locations/:id`
* **Sample Payload**:
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

### Delete Location Node
* **Method**: `DELETE`
* **Route**: `/api/config/locations/:id`
* **Payload**: None

---

## 4. Trip Transactions Operations

### Get Trips Ledger
* **Method**: `GET`
* **Route**: `/api/trips`
* **Payload**: None (Supports optional query parameter: `?status=INSIDE_QUARRY|IN_TRANSIT|UNLOADED`)

### Post Check-in (Phase 1)
* **Method**: `POST`
* **Route**: `/api/trips/checkin`
* **Sample Payload**:
  ```json
  {
    "vehicleNumber": "KA-01-ME-1234",
    "transporterName": "VRL Logistics",
    "quarryEntryTime": "10:00:00",
    "quarryEntryDate": "2026-07-27"
  }
  ```

### Put Checkout (Phase 2)
* **Method**: `PUT`
* **Route**: `/api/trips/checkout/:id`
* **Sample Payload**:
  ```json
  {
    "transitType": "DIGITAL",
    "govtStationaryNumber": "STATION123",
    "dispatchLocationId": 1,
    "materialId": 1,
    "wheelTypeId": 1,
    "netWeightTonne": 25.5,
    "amountEntry": 1500,
    "userLat": 13.0827,
    "userLng": 80.2707,
    "quarryExitTime": "10:30:00",
    "transitFormPhotoUrl": "https://example.com/form.jpg",
    "vehiclePhotoUrl": "https://example.com/truck.jpg"
  }
  ```

### Get Incoming Transit Logs
* **Method**: `GET`
* **Route**: `/api/trips/incoming`
* **Payload**: None

### Put Unload (Phase 3)
* **Method**: `PUT`
* **Route**: `/api/trips/unload/:id`
* **Sample Payload**:
  ```json
  {
    "unloadingLocationId": 3,
    "userLat": 12.9716,
    "userLng": 77.5946,
    "unloadEntryTime": "15:00:00",
    "unloadExitTime": "15:20:00",
    "unloadDate": "2026-07-27",
    "unloadingPhotoUrl": "https://example.com/unload_proof.jpg"
  }
  ```
