export interface ClientTrip {
  id: number;
  status: 'INSIDE_QUARRY' | 'IN_TRANSIT' | 'UNLOADED';
  vehicleNumber: string;
  transporterName: string;
  quarryEntryTime: string;
  quarryEntryDate: string;
  quarryOperatorId?: string | null;
  quarryExitTime?: string | null;
  transitType?: 'MANUAL' | 'DIGITAL' | null;
  govtStationaryNumber?: string | null;
  dispatchLocationId?: number | null;
  materialId?: number | null;
  wheelTypeId?: number | null;
  amountEntry?: number | null;
  netWeightTonne?: number | null;
  quarryGpsLat?: number | null;
  quarryGpsLong?: number | null;
  unloadEntryTime?: string | null;
  unloadExitTime?: string | null;
  unloadDate?: string | null;
  unloadingLocationId?: number | null;
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
    quarryEntryTime: dbTrip.quarry_entry_time,
    quarryEntryDate: dbTrip.quarry_entry_date,
    quarryOperatorId: dbTrip.quarry_operator_id,
    quarryExitTime: dbTrip.quarry_exit_time,
    transitType: dbTrip.transit_type,
    govtStationaryNumber: dbTrip.govt_stationary_number,
    dispatchLocationId: dbTrip.dispatch_location_id !== null && dbTrip.dispatch_location_id !== undefined
      ? parseInt(dbTrip.dispatch_location_id, 10)
      : null,
    materialId: dbTrip.material_id !== null && dbTrip.material_id !== undefined
      ? parseInt(dbTrip.material_id, 10)
      : null,
    wheelTypeId: dbTrip.wheel_type_id !== null && dbTrip.wheel_type_id !== undefined
      ? parseInt(dbTrip.wheel_type_id, 10)
      : null,
    netWeightTonne: dbTrip.net_weight_tonne !== null && dbTrip.net_weight_tonne !== undefined
      ? parseFloat(dbTrip.net_weight_tonne)
      : null,
    amountEntry: dbTrip.amount_entry !== null && dbTrip.amount_entry !== undefined
      ? parseFloat(dbTrip.amount_entry)
      : null,
    quarryGpsLat: dbTrip.quarry_gps_lat !== null && dbTrip.quarry_gps_lat !== undefined
      ? parseFloat(dbTrip.quarry_gps_lat)
      : null,
    quarryGpsLong: dbTrip.quarry_gps_long !== null && dbTrip.quarry_gps_long !== undefined
      ? parseFloat(dbTrip.quarry_gps_long)
      : null,
    unloadEntryTime: dbTrip.unload_entry_time,
    unloadExitTime: dbTrip.unload_exit_time,
    unloadDate: dbTrip.unload_date,
    unloadingLocationId: dbTrip.unloading_location_id !== null && dbTrip.unloading_location_id !== undefined
      ? parseInt(dbTrip.unloading_location_id, 10)
      : null,
    unloadGpsLat: dbTrip.unload_gps_lat !== null && dbTrip.unload_gps_lat !== undefined
      ? parseFloat(dbTrip.unload_gps_lat)
      : null,
    unloadGpsLong: dbTrip.unload_gps_long !== null && dbTrip.unload_gps_long !== undefined
      ? parseFloat(dbTrip.unload_gps_long)
      : null,
    unloadOperatorId: dbTrip.unload_operator_id,
  };
}
