export interface ClientTrip {
  id: number;
  status: 'INSIDE_QUARRY' | 'IN_TRANSIT' | 'UNLOADED';
  vehicleNumber: string;
  transporterName: string;
  checkinTime: string;
  checkinDate?: string;
  quarryOperatorId?: string | null;
  checkoutTime?: string | null;
  transitType?: 'MANUAL' | 'DIGITAL' | null;
  govtStationaryNumber?: string | null;
  material?: string | null;
  lorryTyres?: number | null;
  netWeightTonne?: number | null;
  amountEntry?: number | null;
  dispatchLocation?: string | null;
  transitFormPhotoUrl?: string | null;
  lorryPhotoUrl?: string | null;
  quarryGpsLat?: number | null;
  quarryGpsLong?: number | null;
  unloadEntryTime?: string | null;
  unloadExitTime?: string | null;
  unloadDate?: string | null;
  unloadingLocation?: string | null;
  unloadingPhotoUrl?: string | null;
  unloadGpsLat?: number | null;
  unloadGpsLong?: number | null;
  unloadOperatorId?: string | null;
}

/**
 * Transforms a raw database record in snake_case format to the camelCase contract.
 * Also parses numeric types (e.g. net_weight_tonne, amount_entry, and coordinates) from database string formats.
 * 
 * @param dbTrip Raw record from the 'trips' table
 */
export function mapToClient(dbTrip: any): ClientTrip {
  return {
    id: typeof dbTrip.id === 'string' ? parseInt(dbTrip.id, 10) : dbTrip.id,
    status: dbTrip.status,
    vehicleNumber: dbTrip.vehicle_number,
    transporterName: dbTrip.transporter_name,
    checkinTime: dbTrip.quarry_entry_time,
    checkinDate: dbTrip.quarry_entry_date,
    quarryOperatorId: dbTrip.quarry_operator_id,
    checkoutTime: dbTrip.quarry_exit_time,
    transitType: dbTrip.transit_type,
    govtStationaryNumber: dbTrip.govt_stationary_number,
    material: dbTrip.material,
    lorryTyres: dbTrip.lorry_tyres,
    netWeightTonne: dbTrip.net_weight_tonne !== null && dbTrip.net_weight_tonne !== undefined
      ? parseFloat(dbTrip.net_weight_tonne)
      : null,
    amountEntry: dbTrip.amount_entry !== null && dbTrip.amount_entry !== undefined
      ? parseFloat(dbTrip.amount_entry)
      : null,
    dispatchLocation: dbTrip.dispatch_location,
    transitFormPhotoUrl: dbTrip.transit_form_photo_url,
    lorryPhotoUrl: dbTrip.lorry_photo_url,
    quarryGpsLat: dbTrip.quarry_gps_lat !== null && dbTrip.quarry_gps_lat !== undefined
      ? parseFloat(dbTrip.quarry_gps_lat)
      : null,
    quarryGpsLong: dbTrip.quarry_gps_long !== null && dbTrip.quarry_gps_long !== undefined
      ? parseFloat(dbTrip.quarry_gps_long)
      : null,
    unloadEntryTime: dbTrip.unload_entry_time,
    unloadExitTime: dbTrip.unload_exit_time,
    unloadDate: dbTrip.unload_date,
    unloadingLocation: dbTrip.unloading_location,
    unloadingPhotoUrl: dbTrip.unloading_photo_url,
    unloadGpsLat: dbTrip.unload_gps_lat !== null && dbTrip.unload_gps_lat !== undefined
      ? parseFloat(dbTrip.unload_gps_lat)
      : null,
    unloadGpsLong: dbTrip.unload_gps_long !== null && dbTrip.unload_gps_long !== undefined
      ? parseFloat(dbTrip.unload_gps_long)
      : null,
    unloadOperatorId: dbTrip.unload_operator_id,
  };
}
