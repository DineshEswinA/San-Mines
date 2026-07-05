import { Router, Request, Response } from 'express';
import { getDistance } from '../utils/geo';
import { requireAuth, authorizeRole } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { mapToClient } from '../utils/mapper';

const router = Router();

// Geofencing parameters loaded from environment variables with safe defaults
const QUARRY_LAT = parseFloat(process.env.QUARRY_LAT || '40.7128');
const QUARRY_LNG = parseFloat(process.env.QUARRY_LNG || '-74.0060');
const UNLOAD_LAT = parseFloat(process.env.UNLOAD_LAT || '34.0522');
const UNLOAD_LNG = parseFloat(process.env.UNLOAD_LNG || '-118.2437');
const ALLOWED_RADIUS_METERS = parseFloat(process.env.ALLOWED_RADIUS_METERS || '100');

// Database Schema Enums and Constraints for strict validation
const ALLOWED_MATERIALS = ['river_sand', 'rough_gravel', 'pure_gravel', '10mm_road_metal', '20mm_road_metal', 'msand'];
const ALLOWED_TYRES = [10, 12, 14, 16, 18];

/**
 * Helper utility to verify if a user ID is a valid UUID and exists in the public.profiles database table.
 * Returns the validated UUID if it exists, otherwise returns null to prevent PostgreSQL foreign key constraint errors.
 *
 * @param userId Authenticated user's ID
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
 * @route POST /api/trips/checkin
 * @desc Initialize a checkin log (Accessible by QUARRY_OPERATOR only).
 */
router.post('/checkin', requireAuth, authorizeRole(['QUARRY_OPERATOR']), async (req: Request, res: Response) => {
  const { vehicleNumber, transporterName, checkinTime } = req.body;

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

  // Fallback to runtime date/time if checkinTime is blank or omitted, but keep it editable if passed down
  const resolvedCheckinTime =
    checkinTime && typeof checkinTime === 'string' && checkinTime.trim() !== ''
      ? checkinTime.trim()
      : new Date().toISOString();

  try {
    const operatorId = await getValidProfileId(req.user?.id);

    // Insert record directly into the Supabase 'trips' table
    const { data, error } = await supabase
      .from('trips')
      .insert([
        {
          status: 'INSIDE_QUARRY',
          vehicle_number: vehicleNumber.trim(),
          transporter_name: transporterName.trim(),
          quarry_entry_time: resolvedCheckinTime,
          quarry_entry_date: resolvedCheckinTime.split('T')[0],
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
      id: data.id,
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
 * @desc Authorize checkout and flag as IN_TRANSIT (Accessible by QUARRY_OPERATOR only).
 */
router.put('/checkout/:id', requireAuth, authorizeRole(['QUARRY_OPERATOR']), async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  if (isNaN(tripId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid trip ID format.',
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

    const {
      transitType,
      govtStationaryNumber,
      material,
      lorryTyres,
      netWeightTonne,
      userLat,
      userLng,
      amountEntry,
      checkoutTime,
    } = req.body;

    if (!transitType || (transitType !== 'DIGITAL' && transitType !== 'MANUAL')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: "transitType must be 'DIGITAL' or 'MANUAL'.",
      });
    }

    // RULE A: Alphanumeric and presence verification for DIGITAL transit type
    if (transitType === 'DIGITAL') {
      if (!govtStationaryNumber || typeof govtStationaryNumber !== 'string' || govtStationaryNumber.trim() === '') {
        return res.status(400).json({
          error: 'Bad Request',
          message: "govtStationaryNumber is required when transitType is 'DIGITAL'.",
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

    // Validate material enum constraint
    if (!material || typeof material !== 'string' || !ALLOWED_MATERIALS.includes(material)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `material must be one of the supported types: [${ALLOWED_MATERIALS.join(', ')}].`,
      });
    }

    // Validate lorry_tyres check constraint
    if (typeof lorryTyres !== 'number' || !ALLOWED_TYRES.includes(lorryTyres)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `lorryTyres must be one of the supported check constraints: [${ALLOWED_TYRES.join(', ')}].`,
      });
    }

    if (typeof netWeightTonne !== 'number' || netWeightTonne <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'netWeightTonne must be a positive number.',
      });
    }

    if (typeof amountEntry !== 'number' || amountEntry < 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'amountEntry must be a valid number (>= 0).',
      });
    }

    if (typeof userLat !== 'number' || typeof userLng !== 'number') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userLat and userLng coordinates must be valid numbers.',
      });
    }

    // RULE B: Geofence validation against Quarry Constants
    const distance = getDistance(userLat, userLng, QUARRY_LAT, QUARRY_LNG);
    if (distance > ALLOWED_RADIUS_METERS) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Geofence violation: Distance from quarry is ${distance.toFixed(2)}m, which exceeds the allowed radius of ${ALLOWED_RADIUS_METERS}m.`,
      });
    }

    const resolvedCheckoutTime =
      checkoutTime && typeof checkoutTime === 'string' && checkoutTime.trim() !== ''
        ? checkoutTime.trim()
        : new Date().toISOString();

    // 2. Perform database update
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'IN_TRANSIT',
        transit_type: transitType,
        govt_stationary_number: transitType === 'DIGITAL' ? govtStationaryNumber.trim() : (govtStationaryNumber?.trim() || null),
        material,
        lorry_tyres: lorryTyres,
        net_weight_tonne: netWeightTonne,
        amount_entry: amountEntry,
        quarry_gps_lat: userLat,
        quarry_gps_long: userLng,
        quarry_exit_time: resolvedCheckoutTime,
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

/**
 * @route GET /api/trips/incoming
 * @desc Retrieve all logs where status is IN_TRANSIT (Accessible by UNLOAD_OPERATOR only).
 */
router.get('/incoming', requireAuth, authorizeRole(['UNLOAD_OPERATOR']), async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'IN_TRANSIT');

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch incoming transit logs.',
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
 * @desc Close the trip loop at the unloading site (Accessible by UNLOAD_OPERATOR only).
 */
router.put('/unload/:id', requireAuth, authorizeRole(['UNLOAD_OPERATOR']), async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id as string, 10);
  if (isNaN(tripId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid trip ID format.',
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

    const { unloadingLocation, userLat, userLng, unloadTime } = req.body;

    if (typeof unloadingLocation !== 'string' || unloadingLocation.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'unloadingLocation must be a non-empty string.',
      });
    }

    if (typeof userLat !== 'number' || typeof userLng !== 'number') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userLat and userLng coordinates must be valid numbers.',
      });
    }

    // RULE C: Geofence validation against Unload Constants
    const distance = getDistance(userLat, userLng, UNLOAD_LAT, UNLOAD_LNG);
    if (distance > ALLOWED_RADIUS_METERS) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Geofence violation: Distance from unloading site is ${distance.toFixed(2)}m, which exceeds the allowed radius of ${ALLOWED_RADIUS_METERS}m.`,
      });
    }

    const resolvedUnloadTime =
      unloadTime && typeof unloadTime === 'string' && unloadTime.trim() !== ''
        ? unloadTime.trim()
        : new Date().toISOString();

    const operatorId = await getValidProfileId(req.user?.id);

    // 2. Perform database update
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'UNLOADED',
        unloading_location: unloadingLocation.trim(),
        unload_gps_lat: userLat,
        unload_gps_long: userLng,
        unload_entry_time: resolvedUnloadTime,
        unload_exit_time: resolvedUnloadTime,
        unload_date: resolvedUnloadTime.split('T')[0],
        unload_operator_id: operatorId,
        updated_at: new Date().toISOString(),
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

export default router;
