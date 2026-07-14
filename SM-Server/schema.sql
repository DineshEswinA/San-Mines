-- =========================================================================
-- SAM MINES DATABASE SCHEMA DEFINITION
-- Purpose: Role-Based Material Logistics Tracker
-- Features: Dynamic configuration lookups, multi-stage queues, auto-IDs
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('QUARRY_OPERATOR', 'UNLOAD_OPERATOR', 'SUPER_ADMIN');

-- 3. USER PROFILES TABLE
-- Handles application roles and attaches to Supabase Auth
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'QUARRY_OPERATOR',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. CONFIGURATION MASTER TABLES (Predefined Registries)
-- A. Locations Configuration Table
CREATE TABLE public.locations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- e.g., 'Quarry Base Alpha', 'Unloading Yard Blue'
    node_type TEXT NOT NULL CHECK (node_type IN ('QUARRY', 'UNLOAD_SITE')),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    allowed_radius_meters INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- B. Materials Configuration Table
CREATE TABLE public.materials (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    material_name TEXT NOT NULL UNIQUE, -- Internal identifier (e.g., 'river_sand')
    display_name TEXT NOT NULL,         -- Human readable (e.g., 'River Sand')
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- C. Wheel Types Configuration Table (ID and Value Separated)
CREATE TABLE public.wheel_types (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wheel_count INT NOT NULL UNIQUE,     -- Numeric tracking (e.g., 10, 12)
    display_label TEXT NOT NULL,         -- Screen text (e.g., '10', '12')
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. TRIPS TRANSACTION TABLE (The Core Core Pipeline Lifecycle)
CREATE TABLE public.trips (
    -- Auto-incrementing sequential transaction ID
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'INSIDE_QUARRY' CHECK (status IN ('INSIDE_QUARRY', 'IN_TRANSIT', 'UNLOADED')),
    vehicle_number TEXT NOT NULL,
    transporter_name TEXT NOT NULL,
    
    -- PHASE 1: QUARRY INBOUND ENTRY
    quarry_entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quarry_entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quarry_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- PHASE 2: QUARRY OUTBOUND CHECK-OUT
    quarry_exit_time TIMESTAMPTZ,
    transit_type TEXT CHECK (transit_type IN ('MANUAL', 'DIGITAL')),
    govt_stationary_number VARCHAR(50), -- Supports alphanumeric values
    
    -- Foreign Key Configurations Links
    dispatch_location_id BIGINT REFERENCES public.locations(id) ON DELETE RESTRICT,
    material_id BIGINT REFERENCES public.materials(id) ON DELETE RESTRICT,
    wheel_type_id BIGINT REFERENCES public.wheel_types(id) ON DELETE RESTRICT,
    
    net_weight_tonne NUMERIC(6, 2), 
    amount_entry NUMERIC(10, 2), 
    transit_form_photo_url TEXT,
    lorry_photo_url TEXT,
    quarry_gps_lat NUMERIC(9, 6),
    quarry_gps_long NUMERIC(9, 6),
    
    -- PHASE 3: UNLOADING PLACE ARRIVAL
    unload_entry_time TIMESTAMPTZ,
    unload_exit_time TIMESTAMPTZ,
    unload_date DATE,
    unloading_location_id BIGINT REFERENCES public.locations(id) ON DELETE RESTRICT,
    unloading_photo_url TEXT,
    unload_gps_lat NUMERIC(9, 6),
    unload_gps_long NUMERIC(9, 6),
    unload_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- SYSTEM TRACKING TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =========================================================================
-- 6. INITIAL SEED CONTEXT DATA
-- =========================================================================

-- Seed Materials Registry
INSERT INTO public.materials (material_name, display_name) VALUES
('river_sand', 'River Sand'),
('rough_gravel', 'Rough Gravel'),
('pure_gravel', 'Pure Gravel'),
('10mm_road_metal', '10mm Road Metal'),
('20mm_road_metal', '20mm Road Metal'),
('msand', 'M-Sand');

-- Seed Wheel Configurations (Value and Label matching)
INSERT INTO public.wheel_types (wheel_count, display_label) VALUES 
(10, '10'), 
(12, '12'), 
(14, '14'), 
(16, '16'), 
(18, '18');

-- Seed Initial Target Sites
INSERT INTO public.locations (name, node_type, latitude, longitude, allowed_radius_meters) VALUES
('Quarry Base Alpha', 'QUARRY', 13.082700, 80.270700, 150),
('Quarry Hub Beta', 'QUARRY', 13.047500, 80.208900, 150),
('Unloading Yard Blue', 'UNLOAD_SITE', 12.971600, 77.594600, 200);

-- =========================================================================
-- 7. PERFORMANCE INDEXES
-- =========================================================================
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_vehicle_number ON public.trips(vehicle_number);
CREATE INDEX idx_locations_node_type ON public.locations(node_type);


-- =========================================================================
-- 8. COMPLETE ROW LEVEL SECURITY (RLS) POLICIES FOR SAM MINES
-- =========================================================================

-- 8.1 ENABLE ROW LEVEL SECURITY ACROSS ALL SYSTEM TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- SECTION A: USER ACCESS LAYER (public.profiles)
-- =========================================================================

-- READ: Any logged-in operator can read their own account credentials & role
CREATE POLICY select_own_profile ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- WRITE (All Actions): Only the Super Admin can create, alter, or drop user nodes
CREATE POLICY admin_manage_profiles ON public.profiles
    FOR ALL
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN');


-- =========================================================================
-- SECTION B: MASTER CONFIGURATIONS LAYER (locations, materials, wheel_types)
-- =========================================================================

-- B.1 LOCATIONS REGISTRY
CREATE POLICY allow_all_select_locations ON public.locations
    FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY admin_modify_locations ON public.locations
    FOR ALL 
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN');

-- B.2 MATERIALS REGISTRY
CREATE POLICY allow_all_select_materials ON public.materials
    FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY admin_modify_materials ON public.materials
    FOR ALL
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN');

-- B.3 WHEEL TYPES REGISTRY
CREATE POLICY allow_all_select_wheel_types ON public.wheel_types
    FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY admin_modify_wheel_types ON public.wheel_types
    FOR ALL
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN');


-- =========================================================================
-- SECTION C: TRANSACTION OPERATIONS LAYER (public.trips)
-- =========================================================================

-- C.1 QUARRY OPERATOR PERMISSIONS
-- CREATE: Allows a Quarry Operator to initiate an inbound trip log entry
CREATE POLICY quarry_insert_trips ON public.trips
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'QUARRY_OPERATOR');

-- READ: Allows Quarry Operators to read active yard queues or past dispatches they handled
CREATE POLICY quarry_select_trips ON public.trips
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'QUARRY_OPERATOR' 
        AND (status = 'INSIDE_QUARRY' OR quarry_operator_id = auth.uid())
    );

-- UPDATE: Allows updating the log to check out a truck from the quarry (moving it to 'IN_TRANSIT')
CREATE POLICY quarry_update_trips ON public.trips
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'QUARRY_OPERATOR' 
        AND status = 'INSIDE_QUARRY'
    );

-- C.2 UNLOADING OPERATOR PERMISSIONS
-- READ: Allows Unloading Operators to track trucks on the road or deliveries they personally finalized
CREATE POLICY unload_select_trips ON public.trips
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'UNLOAD_OPERATOR'
        AND (status = 'IN_TRANSIT' OR unload_operator_id = auth.uid())
    );

-- UPDATE: Allows editing open transit logs to complete the unloading close-out phase
CREATE POLICY unload_update_trips ON public.trips
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'UNLOAD_OPERATOR'
        AND status = 'IN_TRANSIT'
    );

-- C.3 SUPER ADMIN MASTER CONTROLS
-- FULL ACCESS: Super Admins bypass the standard workflows to audit or edit any trip transaction in history
CREATE POLICY admin_all_trips ON public.trips
    FOR ALL
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN');