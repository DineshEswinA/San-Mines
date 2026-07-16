import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Auto-resolve localhost/127.0.0.1 issues for simulators and physical devices
if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
  // If running on Android Emulator, localhost maps to 10.0.2.2
  if (Platform.OS === 'android') {
    API_BASE_URL = API_BASE_URL.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  } else {
    // Attempt to extract the dynamic packager host IP address from Expo configurations
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const packagerIp = hostUri.split(':')[0];
      if (packagerIp) {
        // Swap localhost with the local machine IP address (e.g. 192.168.1.5)
        API_BASE_URL = API_BASE_URL.replace('localhost', packagerIp).replace('127.0.0.1', packagerIp);
      }
    }
  }
}

// Bridge UI Material Names to PostgreSQL Enum Value Names
export const mapUiToApiMaterial = (material: string): string => {
  switch (material) {
    case 'Crushed Stone (10mm)': return '10mm_road_metal';
    case 'Crushed Stone (20mm)': return '20mm_road_metal';
    case 'River Sand': return 'river_sand';
    case 'Granite Dust': return 'msand';
    case 'Gravel': return 'rough_gravel';
    case 'Black Soil': return 'pure_gravel';
    default: return 'river_sand';
  }
};

export const mapApiToUiMaterial = (apiMaterial: string): string => {
  switch (apiMaterial) {
    case '10mm_road_metal': return 'Crushed Stone (10mm)';
    case '20mm_road_metal': return 'Crushed Stone (20mm)';
    case 'river_sand': return 'River Sand';
    case 'msand': return 'Granite Dust';
    case 'rough_gravel': return 'Gravel';
    case 'pure_gravel': return 'Black Soil';
    default: return 'River Sand';
  }
};

// Generates dynamic Bearer auth headers reading from the active Supabase token
const getRequestHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log("access token: ", session?.access_token);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
  };
};

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export const api = {
  // 1. POST /api/trips/checkin
  checkIn: async (
    vehicleNumber: string,
    transporterName: string,
    checkinTime?: string
  ): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/trips/checkin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          transporterName: transporterName.trim(),
          checkinTime,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.message || `Check-in failed: Server returned ${response.status}` };
      }
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 2. PUT /api/trips/checkout/:id
  checkOut: async (
    id: string | number,
    checkoutData: {
      transitType: 'MANUAL' | 'DIGITAL';
      govtStationaryNumber?: string;
      dispatchLocationId: number;
      materialId: number;
      wheelTypeId: number;
      netWeightTonne: number;
      amountEntry: number;
      userLat: number;
      userLng: number;
      checkoutTime?: string;
    }
  ): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/trips/checkout/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(checkoutData),
      });

      const result = await response.json();
      if (!response.ok) {
        // Intercept 403 Forbidden which implies geofence radius checks failed
        if (response.status === 403) {
          return { data: null, error: result.message || 'Geofence Validation Failed: Location is outside permitted quarry boundary.' };
        }
        return { data: null, error: result.message || `Checkout failed: Server returned ${response.status}` };
      }
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 3. GET /api/trips/incoming
  getIncoming: async (): Promise<ApiResponse<any[]>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/trips/incoming`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.message || 'Failed to retrieve incoming fleet' };
      }

      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 4. PUT /api/trips/unload/:id
  unload: async (
    id: string | number,
    unloadData: {
      unloadingLocationId: number;
      userLat: number;
      userLng: number;
      unloadEntryTime?: string;
      unloadExitTime?: string;
      unloadDate?: string;
    }
  ): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/trips/unload/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(unloadData),
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          return { data: null, error: result.message || 'Geofence Validation Failed: Location is outside permitted unloading site boundary.' };
        }
        return { data: null, error: result.message || `Verification failed: Server returned ${response.status}` };
      }
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 5. GET /api/config/wheel-types
  getWheelTypes: async (): Promise<ApiResponse<any[]>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/wheel-types`, {
        method: 'GET',
        headers,
      });
      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.message || 'Failed to retrieve wheel types' };
      }
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 6. GET /api/config/materials
  getMaterials: async (): Promise<ApiResponse<any[]>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/materials`, {
        method: 'GET',
        headers,
      });
      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.message || 'Failed to retrieve materials list' };
      }
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 7. GET /api/config/locations
  getLocations: async (type?: 'QUARRY' | 'UNLOAD_SITE'): Promise<ApiResponse<any[]>> => {
    try {
      const headers = await getRequestHeaders();
      const url = type 
        ? `${API_BASE_URL}/api/config/locations?type=${type}` 
        : `${API_BASE_URL}/api/config/locations`;
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.message || 'Failed to retrieve locations' };
      }
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 8. GET /api/trips
  getTrips: async (status?: string): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const url = status 
        ? `${API_BASE_URL}/api/trips?status=${status}` 
        : `${API_BASE_URL}/api/trips`;
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.message || 'Failed to retrieve trips' };
      }
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },
};
