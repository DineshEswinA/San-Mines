import { Router, Request, Response } from 'express';
import { getDistance } from '../utils/geo';
import { requireAuth, authorizeRole } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { mapToClient } from '../utils/mapper';

const tripsRouter = Router();
const configRouter = Router();

/**
 * Helper utility to verify if a user ID is a valid UUID and exists in the public.profiles database table.
 * Returns the validated UUID if it exists, otherwise returns null to prevent PostgreSQL foreign key errors.
 */
async function getValidProfileId(userId: string | undefined): Promise<string | null> {
  if (!userId) return null;

  // Basic UUID regex validator to avoid SQL execution errors
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  if (!isUuid) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }
    return data.id;
  } catch {
    return null;
  }
}

/**
 * Safely resolves a date string to YYYY-MM-DD format.
 */
function resolveDateOnly(inputDate?: string | null, defaultDate = new Date()): string {
  if (inputDate && typeof inputDate === 'string' && inputDate.trim() !== '') {
    const trimmedDate = inputDate.trim();
    if (trimmedDate.includes('T')) {
      return trimmedDate.split('T')[0];
    }
    if (trimmedDate.includes(' ')) {
      return trimmedDate.split(' ')[0];
    }
    return trimmedDate;
  }
  return defaultDate.toISOString().split('T')[0];
}

/**
 * Combines a date string and a time string (or full ISO timestamp) into a valid ISO-8601 TIMESTAMPTZ string.
 */
function combineDateTimeToIso(
  inputTime?: string | null,
  inputDate?: string | null,
  defaultDateTime = new Date()
): string {
  if (!inputTime || typeof inputTime !== 'string' || inputTime.trim() === '') {
    return defaultDateTime.toISOString();
  }

  const trimmedTime = inputTime.trim();

  // If it has '-' and either 'T' or space, it is already a full timestamp/date-time
  if (trimmedTime.includes('-') && (trimmedTime.includes('T') || trimmedTime.includes(' '))) {
    return trimmedTime;
  }

  // It's a time-only string. Let's find the date part.
  const datePart = resolveDateOnly(inputDate, defaultDateTime);

  // Pad seconds if not present (e.g., HH:MM -> HH:MM:00)
  let timePart = trimmedTime;
  const parts = timePart.split(':');
  if (parts.length === 2) {
    timePart = `${timePart}:00`;
  }

  return `${datePart}T${timePart}.000Z`;
}

// ==========================================
// 1. CONFIGURATION LOOKUPS (Authenticated Only)
// ==========================================

/**
 * @route GET /api/config/wheel-types
 * @desc Get all active wheel configuration types
 */
configRouter.get('/wheel-types', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('wheel_types')
      .select('*')
      .order('wheel_count', { ascending: true });

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve wheel types.',
        details: error.message,
      });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to query configurations.',
      details: err.message,
    });
  }
});

/**
 * @route PUT /api/config/wheel-types/:id
 * @desc Toggle or update wheel type status (SUPER_ADMIN only)
 */
configRouter.put('/wheel-types/:id', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const wheelTypeId = parseInt(req.params.id as string, 10);
  const { is_active, wheel_count, display_label } = req.body;

  if (isNaN(wheelTypeId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid wheel type ID is required.',
    });
  }

  try {
    const updatePayload: any = {};
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (wheel_count !== undefined) updatePayload.wheel_count = parseInt(wheel_count as any, 10);
    if (display_label !== undefined) updatePayload.display_label = display_label;

    const { data, error } = await supabase
      .from('wheel_types')
      .update(updatePayload)
      .eq('id', wheelTypeId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to update wheel type in database.',
        details: error.message,
      });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update wheel configuration.',
      details: err.message,
    });
  }
});

/**
 * @route DELETE /api/config/wheel-types/:id
 * @desc Delete a wheel type configuration (SUPER_ADMIN only)
 */
configRouter.delete('/wheel-types/:id', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const wheelTypeId = parseInt(req.params.id as string, 10);

  if (isNaN(wheelTypeId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid wheel type ID is required.',
    });
  }

  try {
    const { data: refTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('wheel_type_id', wheelTypeId)
      .limit(1);

    if (refTrips && refTrips.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete wheel type configuration: It is referenced by active or historic trips.',
      });
    }

    const { error } = await supabase
      .from('wheel_types')
      .delete()
      .eq('id', wheelTypeId);

    if (error) {
      if (error.code === '23503') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Cannot delete wheel type configuration: It is referenced by active or historic trips.',
        });
      }
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to delete wheel type configuration from database.',
        details: error.message,
      });
    }

    return res.json({ message: 'Wheel type configuration deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete wheel configuration.',
      details: err.message,
    });
  }
});

/**
 * @route POST /api/config/wheel-types
 * @desc Create a new wheel type configuration (SUPER_ADMIN only)
 */
configRouter.post('/wheel-types', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const { wheel_count, display_label } = req.body;

  if (wheel_count === undefined || !display_label) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Fields wheel_count and display_label are required.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('wheel_types')
      .insert({
        wheel_count: parseInt(wheel_count as any, 10),
        display_label,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to create wheel type in database.',
        details: error.message,
      });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create wheel type.',
      details: err.message,
    });
  }
});

/**
 * @route GET /api/config/materials
 * @desc Get all material types lookup list
 */
configRouter.get('/materials', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('material_name', { ascending: true });

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve materials list.',
        details: error.message,
      });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to query materials.',
      details: err.message,
    });
  }
});

/**
 * @route POST /api/config/materials
 * @desc Create a new material type chip (SUPER_ADMIN only)
 */
configRouter.post('/materials', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const { material_name, display_name } = req.body;

  if (!material_name || !display_name) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Fields material_name and display_name are required.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('materials')
      .insert({
        material_name,
        display_name,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to create material in database.',
        details: error.message,
      });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create material.',
      details: err.message,
    });
  }
});

/**
 * @route GET /api/config/locations
 * @desc Get list of locations with optional filter by ?type=QUARRY or ?type=UNLOAD_SITE
 */
configRouter.get('/locations', requireAuth, async (req: Request, res: Response) => {
  const { type } = req.query;

  try {
    let query = supabase.from('locations').select('*');
    if (type === 'QUARRY' || type === 'UNLOAD_SITE') {
      query = query.eq('node_type', type);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve locations.',
        details: error.message,
      });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to query locations.',
      details: err.message,
    });
  }
});

/**
 * @route POST /api/config/locations
 * @desc Create a new location node (SUPER_ADMIN only)
 */
configRouter.post('/locations', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const { name, node_type, latitude, longitude, allowed_radius_meters } = req.body;

  if (!name || !node_type || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Fields name, node_type, latitude, and longitude are required.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('locations')
      .insert({
        name,
        node_type,
        latitude,
        longitude,
        allowed_radius_meters: allowed_radius_meters || 100,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to create location node in database.',
        details: error.message,
      });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create location.',
      details: err.message,
    });
  }
});

/**
 * @route PUT /api/config/locations/:id
 * @desc Edit an existing location node (SUPER_ADMIN only)
 */
configRouter.put('/locations/:id', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const locId = parseInt(req.params.id as string, 10);
  const { name, node_type, latitude, longitude, allowed_radius_meters, is_active } = req.body;

  if (isNaN(locId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid location ID is required.',
    });
  }

  try {
    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name;
    if (node_type !== undefined) updatePayload.node_type = node_type;
    if (latitude !== undefined) updatePayload.latitude = latitude;
    if (longitude !== undefined) updatePayload.longitude = longitude;
    if (allowed_radius_meters !== undefined) updatePayload.allowed_radius_meters = allowed_radius_meters;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await supabase
      .from('locations')
      .update(updatePayload)
      .eq('id', locId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to update location node in database.',
        details: error.message,
      });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update location.',
      details: err.message,
    });
  }
});

/**
 * @route DELETE /api/config/locations/:id
 * @desc Delete a location node (SUPER_ADMIN only)
 */
configRouter.delete('/locations/:id', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const locId = parseInt(req.params.id as string, 10);

  if (isNaN(locId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid location ID is required.',
    });
  }

  try {
    const { data: refTrips } = await supabase
      .from('trips')
      .select('id')
      .or(`dispatch_location_id.eq.${locId},unloading_location_id.eq.${locId}`)
      .limit(1);

    if (refTrips && refTrips.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete location node: It is referenced by active or historic trips.',
      });
    }

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locId);

    if (error) {
      if (error.code === '23503') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Cannot delete location node: It is referenced by active or historic trips.',
        });
      }
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to delete location node from database.',
        details: error.message,
      });
    }

    return res.json({ message: 'Location node deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete location.',
      details: err.message,
    });
  }
});

/**
 * @route PUT /api/config/materials/:id
 * @desc Edit an existing material chip (SUPER_ADMIN only)
 */
configRouter.put('/materials/:id', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const matId = parseInt(req.params.id as string, 10);
  const { material_name, display_name, is_active } = req.body;

  if (isNaN(matId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid material ID is required.',
    });
  }

  try {
    const updatePayload: any = {};
    if (material_name !== undefined) updatePayload.material_name = material_name;
    if (display_name !== undefined) updatePayload.display_name = display_name;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await supabase
      .from('materials')
      .update(updatePayload)
      .eq('id', matId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to update material in database.',
        details: error.message,
      });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update material.',
      details: err.message,
    });
  }
});

/**
 * @route DELETE /api/config/materials/:id
 * @desc Delete a material chip (SUPER_ADMIN only)
 */
configRouter.delete('/materials/:id', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const matId = parseInt(req.params.id as string, 10);

  if (isNaN(matId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid material ID is required.',
    });
  }

  try {
    const { data: refTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('material_id', matId)
      .limit(1);

    if (refTrips && refTrips.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete material chip: It is referenced by active or historic trips.',
      });
    }

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', matId);

    if (error) {
      if (error.code === '23503') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Cannot delete material chip: It is referenced by active or historic trips.',
        });
      }
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to delete material chip from database.',
        details: error.message,
      });
    }

    return res.json({ message: 'Material chip deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete material.',
      details: err.message,
    });
  }
});

// ==========================================
// 2. QUARRY OPERATIONS (QUARRY_OPERATOR Only)
// ==========================================

/**
 * @route POST /api/trips/checkin
 * @desc Initialize check-in logging for a vehicle arriving at a quarry
 */
tripsRouter.post('/checkin', requireAuth, authorizeRole(['QUARRY_OPERATOR', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  const { vehicleNumber, transporterName, quarryEntryTime, quarryEntryDate } = req.body;

  if (!vehicleNumber || typeof vehicleNumber !== 'string' || vehicleNumber.trim() === '') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'vehicleNumber is required and cannot be blank.',
    });
  }

  if (!transporterName || typeof transporterName !== 'string' || transporterName.trim() === '') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'transporterName is required and cannot be blank.',
    });
  }

  // Fallback to machine timestamps if missing from payload, deriving date from entry time if possible
  const now = new Date();
  const resolvedEntryDate = quarryEntryTime && quarryEntryTime.includes('T')
    ? quarryEntryTime.split('T')[0]
    : resolveDateOnly(quarryEntryDate || null, now);
  const resolvedEntryTime = combineDateTimeToIso(quarryEntryTime, resolvedEntryDate, now);

  try {
    const operatorId = await getValidProfileId(req.user?.id);

    const { data, error } = await supabase
      .from('trips')
      .insert([
        {
          status: 'INSIDE_QUARRY',
          vehicle_number: vehicleNumber.trim(),
          transporter_name: transporterName.trim(),
          quarry_entry_time: resolvedEntryTime,
          quarry_entry_date: resolvedEntryDate,
          quarry_operator_id: operatorId,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to record checkin in database.',
        details: error?.message,
      });
    }

    return res.status(201).json({
      message: 'Check-in successful.',
      trip_id: data.id,
      trip: mapToClient(data),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during checkin database insertion.',
      details: err.message,
    });
  }
});

/**
 * @route PUT /api/trips/checkout/:id
 * @desc Authorize checkout, validate geofence at quarry location, and set status to 'IN_TRANSIT'
 */
tripsRouter.put('/checkout/:id', requireAuth, authorizeRole(['QUARRY_OPERATOR', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  if (isNaN(tripId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid trip ID format.',
    });
  }

  const {
    transitType,
    govtStationaryNumber,
    dispatchLocationId,
    materialId,
    wheelTypeId,
    netWeightTonne,
    amountEntry,
    userLat,
    userLng,
    quarryExitTime,
  } = req.body;

  // Initial validation
  if (!transitType || (transitType !== 'DIGITAL' && transitType !== 'MANUAL')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "transitType must be 'DIGITAL' or 'MANUAL'.",
    });
  }

  // RULE 1: Alphanumeric and presence verification if transitType is DIGITAL
  if (transitType === 'DIGITAL') {
    if (!govtStationaryNumber || typeof govtStationaryNumber !== 'string' || govtStationaryNumber.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'govtStationaryNumber is required and cannot be blank when transitType is DIGITAL.',
      });
    }

    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(govtStationaryNumber);
    if (!isAlphanumeric) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'govtStationaryNumber must be strictly alphanumeric.',
      });
    }
  }

  if (!dispatchLocationId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'dispatchLocationId is required.',
    });
  }

  if (!materialId || !wheelTypeId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'materialId and wheelTypeId are required.',
    });
  }

  if (typeof netWeightTonne !== 'number' || netWeightTonne <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'netWeightTonne must be a positive number.',
    });
  }

  if (typeof userLat !== 'number' || typeof userLng !== 'number') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'userLat and userLng coordinates must be valid numbers.',
    });
  }

  try {
    // 1. Fetch current trip status from Supabase
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !trip) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Trip with ID ${tripId} not found.`,
      });
    }

    if (trip.status !== 'INSIDE_QUARRY') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Trip is in state '${trip.status}'. Checkout is only permitted for trips in 'INSIDE_QUARRY' state.`,
      });
    }

    // 2. Fetch dispatch location to run Geofencing check
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('latitude, longitude, allowed_radius_meters, node_type')
      .eq('id', dispatchLocationId)
      .single();

    if (locError || !location) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Dispatch location with ID ${dispatchLocationId} not found.`,
      });
    }

    if (location.node_type !== 'QUARRY') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Selected dispatchLocationId is not designated as a QUARRY site.',
      });
    }

    // RULE 2: Geofence check using Haversine Formula (DISABLED)
    // const distance = getDistance(userLat, userLng, parseFloat(location.latitude), parseFloat(location.longitude));
    // const allowedRadius = parseFloat(location.allowed_radius_meters || '100');
    //
    // if (distance > allowedRadius) {
    //   return res.status(403).json({
    //     error: 'Forbidden',
    //     message: `Geofence violation: Distance from quarry is ${distance.toFixed(2)}m, which exceeds the allowed radius of ${allowedRadius}m.`,
    //   });
    // }

    const resolvedExitTime = combineDateTimeToIso(quarryExitTime, null, new Date());

    // 3. Save the updated checkout transaction details
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'IN_TRANSIT',
        transit_type: transitType,
        govt_stationary_number: govtStationaryNumber ? govtStationaryNumber.trim() : null,
        dispatch_location_id: dispatchLocationId,
        material_id: materialId,
        wheel_type_id: wheelTypeId,
        net_weight_tonne: netWeightTonne,
        amount_entry: amountEntry !== undefined ? amountEntry : null,
        quarry_gps_lat: null,
        quarry_gps_long: null,
        quarry_exit_time: resolvedExitTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tripId)
      .select()
      .single();

    if (updateError || !updatedTrip) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to record checkout in database.',
        details: updateError?.message,
      });
    }

    return res.json({
      message: 'Checkout successful. Vehicle is now in transit.',
      trip: mapToClient(updatedTrip),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during checkout database modification.',
      details: err.message,
    });
  }
});

// ==========================================
// 3. UNLOADING SITE OPERATIONS (UNLOAD_OPERATOR Only)
// ==========================================

/**
 * @route GET /api/trips/incoming
 * @desc Get all fleet vehicles currently in transit (status == 'IN_TRANSIT')
 */
tripsRouter.get('/incoming', requireAuth, authorizeRole(['UNLOAD_OPERATOR', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'IN_TRANSIT');

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve incoming fleet.',
        details: error.message,
      });
    }

    const mappedTrips = (data || []).map((trip) => mapToClient(trip));
    return res.json(mappedTrips);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during database fetch.',
      details: err.message,
    });
  }
});

/**
 * @route PUT /api/trips/unload/:id
 * @desc Complete the unloading transaction, check geofence limits, and close trip status loop
 */
tripsRouter.put('/unload/:id', requireAuth, authorizeRole(['UNLOAD_OPERATOR', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  if (isNaN(tripId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid trip ID format.',
    });
  }

  const { unloadingLocationId, userLat, userLng, unloadEntryTime, unloadExitTime, unloadDate } = req.body;

  if (!unloadingLocationId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'unloadingLocationId is required.',
    });
  }

  if (typeof userLat !== 'number' || typeof userLng !== 'number') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'userLat and userLng coordinates must be valid numbers.',
    });
  }

  try {
    // 1. Fetch current trip status from Supabase
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !trip) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Trip with ID ${tripId} not found.`,
      });
    }

    if (trip.status !== 'IN_TRANSIT') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Trip is in state '${trip.status}'. Unloading is only permitted for trips in 'IN_TRANSIT' state.`,
      });
    }

    // 2. Fetch unloading location coordinates for geofence validation
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('latitude, longitude, allowed_radius_meters, node_type')
      .eq('id', unloadingLocationId)
      .single();

    if (locError || !location) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Unloading location with ID ${unloadingLocationId} not found.`,
      });
    }

    if (location.node_type !== 'UNLOAD_SITE') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Selected unloadingLocationId is not designated as an UNLOAD_SITE.',
      });
    }

    // RULE 1 (Geofence check): Run Haversine check (DISABLED)
    // const distance = getDistance(userLat, userLng, parseFloat(location.latitude), parseFloat(location.longitude));
    // const allowedRadius = parseFloat(location.allowed_radius_meters || '100');
    //
    // if (distance > allowedRadius) {
    //   return res.status(403).json({
    //     error: 'Forbidden',
    //     message: `Geofence violation: Distance from unloading site is ${distance.toFixed(2)}m, which exceeds the allowed radius of ${allowedRadius}m.`,
    //   });
    // }

    const now = new Date();
    const resolvedUnloadDate = resolveDateOnly(unloadDate, now);
    const resolvedEntryTime = combineDateTimeToIso(unloadEntryTime, resolvedUnloadDate, now);
    const resolvedExitTime = combineDateTimeToIso(unloadExitTime, resolvedUnloadDate, now);

    const operatorId = await getValidProfileId(req.user?.id);

    // 3. Save the unloading site operations and update status to 'UNLOADED'
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'UNLOADED',
        unloading_location_id: unloadingLocationId,
        unload_gps_lat: null,
        unload_gps_long: null,
        unload_entry_time: resolvedEntryTime,
        unload_exit_time: resolvedExitTime,
        unload_date: resolvedUnloadDate,
        unload_operator_id: operatorId,
        updated_at: now.toISOString(),
      })
      .eq('id', tripId)
      .select()
      .single();

    if (updateError || !updatedTrip) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to record unload in database.',
        details: updateError?.message,
      });
    }

    return res.json({
      message: 'Trip successfully unloaded. Pipeline completed.',
      trip: mapToClient(updatedTrip),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during unload database modification.',
      details: err.message,
    });
  }
});

/**
 * @route GET /api/trips
 * @desc Get all trips with optional filtering by status
 */
tripsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  const { status } = req.query;

  try {
    let query = supabase.from('trips').select('*', { count: 'exact' });

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    } else if (userRole === 'QUARRY_OPERATOR') {
      query = query.eq('status', 'INSIDE_QUARRY');
    } else if (userRole === 'UNLOAD_OPERATOR') {
      query = query.in('status', ['IN_TRANSIT', 'UNLOADED']);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve trips.',
        details: error.message,
      });
    }

    const mappedTrips = (data || []).map((trip) => mapToClient(trip));
    return res.json({
      trips: mappedTrips,
      total: count || 0,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to query trips.',
      details: err.message,
    });
  }
});

export { tripsRouter, configRouter };

