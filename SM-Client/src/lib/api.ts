import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Declare global React Native __DEV__ variable for TypeScript compiler if needed
declare const __DEV__: boolean;

let API_BASE_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000')
  : 'https://san-mines.vercel.app';

// Auto-resolve localhost/127.0.0.1 issues for simulators and physical devices
// if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
//   // If running on Android Emulator, localhost maps to 10.0.2.2
//   if (Platform.OS === 'android') {
//     API_BASE_URL = API_BASE_URL.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
//   } else {
//     // Attempt to extract the dynamic packager host IP address from Expo configurations
//     const hostUri = Constants.expoConfig?.hostUri;
//     if (hostUri) {
//       const packagerIp = hostUri.split(':')[0];
//       if (packagerIp) {
//         // Swap localhost with the local machine IP address (e.g. 192.168.1.5)
//         API_BASE_URL = API_BASE_URL.replace('localhost', packagerIp).replace('127.0.0.1', packagerIp);
//       }
//     }
//   }
// }

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
  if (!session || !session.access_token) {
    throw new Error('No active session. Please log in.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
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
    quarryEntryTime?: string
  ): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/trips/checkin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          transporterName: transporterName.trim(),
          quarryEntryTime,
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
      quarryExitTime?: string;
      transitFormPhotoUrl?: string;
      vehiclePhotoUrl?: string;
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
      unloadingPhotoUrl?: string;
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

  // 9. GET /api/users
  getUsers: async (): Promise<ApiResponse<any[]>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'GET',
        headers,
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to retrieve users list' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text. Please ensure the backend server is running and deployed.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 10. PATCH /api/users/:id/role
  updateUserRole: async (id: string, role: string): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/users/${id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role }),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to update user role' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text. Please ensure the backend server is running and deployed.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 11. POST /api/config/locations
  createLocation: async (locationData: {
    name: string;
    node_type: 'QUARRY' | 'UNLOAD_SITE';
    latitude: number;
    longitude: number;
    allowed_radius_meters: number;
  }): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/locations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(locationData),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to create location' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text. Please ensure the backend server is running and deployed.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 12. POST /api/config/materials
  createMaterial: async (materialData: {
    material_name: string;
    display_name: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/materials`, {
        method: 'POST',
        headers,
        body: JSON.stringify(materialData),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to create material' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text. Please ensure the backend server is running and deployed.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 13. PUT /api/config/wheel-types/:id
  updateWheelType: async (
    id: number,
    updateData: { is_active?: boolean; wheel_count?: number; display_label?: string } | boolean
  ): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const payload = typeof updateData === 'boolean' ? { is_active: updateData } : updateData;
      const response = await fetch(`${API_BASE_URL}/api/config/wheel-types/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to update wheel type' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text. Please ensure the backend server is running and deployed.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 13.b DELETE /api/config/wheel-types/:id
  deleteWheelType: async (id: number): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/wheel-types/${id}`, {
        method: 'DELETE',
        headers,
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to delete wheel type' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 13.c PUT /api/config/materials/:id
  updateMaterial: async (id: number, materialData: { material_name?: string; display_name?: string; is_active?: boolean }): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/materials/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(materialData),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to update material' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 13.d DELETE /api/config/materials/:id
  deleteMaterial: async (id: number): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/materials/${id}`, {
        method: 'DELETE',
        headers,
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to delete material' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 13.e PUT /api/config/locations/:id
  updateLocation: async (id: number, locationData: { name?: string; node_type?: 'QUARRY' | 'UNLOAD_SITE'; latitude?: number; longitude?: number; allowed_radius_meters?: number; is_active?: boolean }): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/locations/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(locationData),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to update location' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 13.f DELETE /api/config/locations/:id
  deleteLocation: async (id: number): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/locations/${id}`, {
        method: 'DELETE',
        headers,
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to delete location' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 13.g POST /api/config/wheel-types
  createWheelType: async (wheelData: { wheel_count: number; display_label: string }): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/config/wheel-types`, {
        method: 'POST',
        headers,
        body: JSON.stringify(wheelData),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to create wheel type' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },

  // 14. POST /api/users
  createUser: async (userData: {
    email: string;
    password: string;
    role: string;
    full_name: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(userData),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: result.message || 'Failed to create user' };
        }
        return { data: result, error: null };
      } else {
        return {
          data: null,
          error: `Server error (${response.status}): Expected JSON, got HTML/text. Please ensure the backend server is running and deployed.`
        };
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network request failed' };
    }
  },
};
