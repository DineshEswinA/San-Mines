/**
 * Computes the distance in meters between two sets of GPS latitude/longitude coordinates
 * using the Haversine Formula.
 *
 * @param lat1 Latitude of the first coordinate in decimal degrees.
 * @param lon1 Longitude of the first coordinate in decimal degrees.
 * @param lat2 Latitude of the second coordinate in decimal degrees.
 * @param lon2 Longitude of the second coordinate in decimal degrees.
 * @returns The spherical distance in meters between the two points.
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Mean radius of the Earth in meters
  
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}
