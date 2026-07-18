import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'QUARRY_OPERATOR' | 'UNLOAD_OPERATOR' | 'SUPER_ADMIN';

export interface QuarryCheckIn {
  id: string;
  transporterName: string;
  vehicleNumber: string;
  entryTime: number;
  status: 'INSIDE_QUARRY' | 'IN_TRANSIT' | 'UNLOADED';
}

export interface QuarryCheckOut extends Omit<QuarryCheckIn, 'status'> {
  exitTime: number;
  transitType: 'MANUAL' | 'DIGITAL';
  govtStationaryNumber?: string;
  material: string;
  tyres: number;
  netWeight: number;
  amount: number;
  transitFormPhoto?: string;
  lorryPhoto?: string;
  gpsCoordinates: {
    latitude: number;
    longitude: number;
  } | null;
  status: 'IN_TRANSIT' | 'UNLOADED';
}

export const formatTimeTo12Hour = (epoch: number | string | Date): string => {
  if (!epoch) return '';
  const date = new Date(epoch);
  if (isNaN(date.getTime())) return '';
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export const formatDateOnly = (epoch: number | string | Date): string => {
  if (!epoch) return '';
  const date = new Date(epoch);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

export interface UnloadVerification extends Omit<QuarryCheckOut, 'status'> {
  unloadDate: string;
  unloadEntryTime: string;
  unloadingLocation: string;
  unloadExitTime: string;
  unloadPhoto?: string;
  status: 'UNLOADED';
}

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<{ error: string | null }>;
  // Quarry Operator specific data (Throws error if accessed by Unloading Operator)
  getQuarryQueue: () => QuarryCheckIn[];
  fetchQuarryQueue: () => Promise<void>;
  checkInLorry: (transporterName: string, vehicleNumber: string, date: string, time: string) => Promise<void>;
  checkOutLorry: (
    id: string,
    checkOutData: {
      exitTime: string;
      transitType: 'MANUAL' | 'DIGITAL';
      govtStationaryNumber?: string;
      dispatchLocationId: number;
      materialId: number;
      wheelTypeId: number;
      netWeight: number;
      amount: number;
      transitFormPhoto?: string;
      lorryPhoto?: string;
      gpsCoordinates: {
        latitude: number;
        longitude: number;
      } | null;
    }
  ) => Promise<void>;

  // Unload Operator specific data (Throws error if accessed by Quarry Operator)
  getIncomingFleet: () => QuarryCheckOut[];
  fetchIncomingFleet: () => Promise<void>;
  verifyAndCloseTrip: (
    id: string,
    verificationData: {
      unloadDate: string;
      unloadEntryTime: string;
      unloadingLocationId: number;
      unloadExitTime: string;
      unloadPhoto?: string;
    }
  ) => Promise<void>;

  // Shared / Archive (For simulation tracking/debugging or history)
  getCompletedArchives: () => UnloadVerification[];

  // Configurations
  materials: any[];
  wheelTypes: any[];
  locations: any[];
  fetchConfigData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('QUARRY_OPERATOR');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Keep separate state arrays for strict data isolation
  const [quarryQueue, setQuarryQueue] = useState<QuarryCheckIn[]>([]);
  const [transitFleet, setTransitFleet] = useState<QuarryCheckOut[]>([]);
  const [completedArchives, setCompletedArchives] = useState<UnloadVerification[]>([]);

  // Configuration Lookups State
  const [materials, setMaterials] = useState<any[]>([]);
  const [wheelTypes, setWheelTypes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const fetchConfigData = async () => {
    const [mRes, wRes, lRes] = await Promise.all([
      api.getMaterials(),
      api.getWheelTypes(),
      api.getLocations(),
    ]);
    if (mRes.data) setMaterials(mRes.data);
    if (wRes.data) setWheelTypes(wRes.data);
    if (lRes.data) setLocations(lRes.data);
  };

  // Monitor session changes with active Supabase listener
  useEffect(() => {
    let active = true;

    const fetchUserRole = async (userId: string): Promise<Role> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          return 'QUARRY_OPERATOR';
        }

        return data?.role || 'QUARRY_OPERATOR';
      } catch (err) {
        console.error('Exception fetching user role:', err);
        return 'QUARRY_OPERATOR';
      }
    };

    const initializeUser = async (session: any) => {
      if (!session) {
        if (active) {
          setIsAuthenticated(false);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
        try {
          await AsyncStorage.removeItem('user_role');
        } catch (err) {
          console.error('Failed to remove role from storage:', err);
        }
        return;
      }

      if (active) {
        setIsAuthenticated(true);
      }

      let fetchedRole: Role | null = null;
      try {
        const storedRole = await AsyncStorage.getItem('user_role');
        if (storedRole && active) {
          fetchedRole = storedRole as Role;
          setIsSuperAdmin(fetchedRole === 'SUPER_ADMIN');
          setRole(fetchedRole);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to read role from local storage:', err);
      }

      try {
        await fetchConfigData();
        const latestRole = await fetchUserRole(session.user.id);

        try {
          await AsyncStorage.setItem('user_role', latestRole);
        } catch (err) {
          console.error('Failed to write role to local storage:', err);
        }

        if (active) {
          setIsSuperAdmin(latestRole === 'SUPER_ADMIN');
        }

        if (active && latestRole !== fetchedRole) {
          setRole(latestRole);
        }
      } catch (err) {
        console.error('Failed to initialize user session or config:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    // Get initial session status on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializeUser(session);
    }).catch(() => {
      if (active) setIsLoading(false);
    });

    // Listen for authentication changes (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      initializeUser(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const isConfigured = () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    return (
      url &&
      url !== 'https://placeholder-url.supabase.co' &&
      key &&
      key !== 'placeholder-anon-key'
    );
  };

  const login = async (email: string, password: string) => {
    if (!isConfigured()) {
      return {
        error: 'Supabase credentials are not configured. Please create a .env file in the root of the project and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your database details.',
      };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ? error.message : null };
  };

  const signUp = async (fullName: string, email: string, password: string) => {
    if (!isConfigured()) {
      return {
        error: 'Supabase credentials are not configured. Please create a .env file in the root of the project and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your database details.',
      };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (!error && data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email.trim(),
          role: 'QUARRY_OPERATOR',
        });
      if (profileError) {
        return { error: `Auth succeeded, but profile creation failed: ${profileError.message}` };
      }
    }

    return { error: error ? error.message : null };
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user_role');
    } catch (err) {
      console.error('Failed to clear role on logout:', err);
    }
    setIsSuperAdmin(false);
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  };

  // Security Access Guards
  const assertQuarryAccess = () => {
    if (role !== 'QUARRY_OPERATOR' && role !== 'SUPER_ADMIN') {
      throw new Error(`Security Violation: Unloading Operator tried to access Quarry Operator memory.`);
    }
  };

  const assertUnloadAccess = () => {
    if (role !== 'UNLOAD_OPERATOR' && role !== 'SUPER_ADMIN') {
      throw new Error(`Security Violation: Quarry Operator tried to access Unloading Place memory.`);
    }
  };

  const getQuarryQueue = () => {
    assertQuarryAccess();
    return quarryQueue;
  };

  const getIncomingFleet = () => {
    assertUnloadAccess();
    return transitFleet;
  };

  const getCompletedArchives = () => {
    return completedArchives;
  };



  const fetchQuarryQueue = async () => {
    assertQuarryAccess();
    const res = await api.getTrips();
    if (res.error) {
      throw new Error(res.error);
    }
    if (res.data && res.data.trips) {
      const mapped: QuarryCheckIn[] = res.data.trips.map((trip: any) => {
        return {
          id: String(trip.id),
          transporterName: trip.transporterName,
          vehicleNumber: trip.vehicleNumber,
          entryTime: Number(trip.quarryEntryTime),
          status: trip.status || 'INSIDE_QUARRY',
        };
      });
      setQuarryQueue(mapped);
    }
  };

  const fetchIncomingFleet = async () => {
    assertUnloadAccess();
    if (materials.length === 0 || wheelTypes.length === 0) {
      await fetchConfigData();
    }
    const res = await api.getTrips();
    if (res.error) {
      throw new Error(res.error);
    }
    if (res.data && res.data.trips) {
      const mapped: QuarryCheckOut[] = res.data.trips.map((trip: any) => {
        const mat = materials.find(m => m.id === trip.materialId);
        const materialDisplayName = mat ? mat.display_name : `Material #${trip.materialId}`;

        const wheel = wheelTypes.find(w => w.id === trip.wheelTypeId);
        const tyreCount = wheel ? wheel.wheel_count : 10;

        return {
          id: String(trip.id),
          transporterName: trip.transporterName,
          vehicleNumber: trip.vehicleNumber,
          entryTime: Number(trip.quarryEntryTime),
          exitTime: Number(trip.quarryExitTime),
          transitType: trip.transitType,
          govtStationaryNumber: trip.govtStationaryNumber || '',
          material: materialDisplayName,
          tyres: tyreCount,
          netWeight: Number(trip.netWeightTonne || 0),
          amount: Number(trip.amountEntry || 0),
          gpsCoordinates: trip.quarryGpsLat ? { latitude: Number(trip.quarryGpsLat), longitude: Number(trip.quarryGpsLong) } : null,
          status: trip.status || 'IN_TRANSIT',
        };
      });
      setTransitFleet(mapped);
    }
  };

  const checkInLorry = async (transporterName: string, vehicleNumber: string, date: string, time: string) => {
    assertQuarryAccess();
    // Parse combined checkin timestamp into ISO standard format for TIMESTAMPTZ support
    const isoDateTime = `${date}T${time}:00.000Z`;
    const res = await api.checkIn(vehicleNumber, transporterName, isoDateTime);
    if (res.error) {
      throw new Error(res.error);
    }
    if (res.data && res.data.trip) {
      const serverTrip = res.data.trip;
      const newLorry: QuarryCheckIn = {
        id: String(serverTrip.id),
        transporterName: serverTrip.transporterName,
        vehicleNumber: serverTrip.vehicleNumber,
        entryTime: Number(serverTrip.quarryEntryTime),
        status: 'INSIDE_QUARRY',
      };
      setQuarryQueue((prev) => [...prev, newLorry]);
    }
  };

  const checkOutLorry = async (
    id: string,
    checkOutData: {
      exitTime: string;
      transitType: 'MANUAL' | 'DIGITAL';
      govtStationaryNumber?: string;
      dispatchLocationId: number;
      materialId: number;
      wheelTypeId: number;
      netWeight: number;
      amount: number;
      transitFormPhoto?: string;
      lorryPhoto?: string;
      gpsCoordinates: {
        latitude: number;
        longitude: number;
      } | null;
    }
  ) => {
    assertQuarryAccess();
    const lorryToCheckout = quarryQueue.find((l) => l.id === id);
    if (!lorryToCheckout) throw new Error('Lorry not found in waiting queue');

    // Parse combined exit timestamp
    const entryDate = formatDateOnly(lorryToCheckout.entryTime);
    const isoExitTime = `${entryDate}T${checkOutData.exitTime}:00.000Z`;
    const res = await api.checkOut(id, {
      transitType: checkOutData.transitType,
      govtStationaryNumber: checkOutData.govtStationaryNumber,
      dispatchLocationId: checkOutData.dispatchLocationId,
      materialId: checkOutData.materialId,
      wheelTypeId: checkOutData.wheelTypeId,
      netWeightTonne: checkOutData.netWeight,
      amountEntry: checkOutData.amount,
      userLat: checkOutData.gpsCoordinates?.latitude || 0,
      userLng: checkOutData.gpsCoordinates?.longitude || 0,
      quarryExitTime: isoExitTime,
    });

    if (res.error) {
      throw new Error(res.error);
    }

    setQuarryQueue((prev) => prev.filter((l) => l.id !== id));
  };

  const verifyAndCloseTrip = async (
    id: string,
    verificationData: {
      unloadDate: string;
      unloadEntryTime: string;
      unloadingLocationId: number;
      unloadExitTime: string;
      unloadPhoto?: string;
    }
  ) => {
    assertUnloadAccess();
    const lorryToVerify = transitFleet.find((l) => l.id === id);
    if (!lorryToVerify) throw new Error('Vehicle not found in incoming fleet queue');

    const isoUnloadEntryTime = `${verificationData.unloadDate}T${verificationData.unloadEntryTime}:00.000Z`;
    const isoUnloadExitTime = `${verificationData.unloadDate}T${verificationData.unloadExitTime}:00.000Z`;

    const selectedLoc = locations.find(l => l.id === verificationData.unloadingLocationId);
    const userLat = selectedLoc ? Number(selectedLoc.latitude) : 12.971600;
    const userLng = selectedLoc ? Number(selectedLoc.longitude) : 77.594600;

    const res = await api.unload(id, {
      unloadingLocationId: verificationData.unloadingLocationId,
      userLat,
      userLng,
      unloadEntryTime: isoUnloadEntryTime,
      unloadExitTime: isoUnloadExitTime,
      unloadDate: verificationData.unloadDate,
    });

    if (res.error) {
      throw new Error(res.error);
    }

    const unloadLocationName = selectedLoc ? selectedLoc.name : `Unload Site #${verificationData.unloadingLocationId}`;

    const closedTrip: UnloadVerification = {
      ...lorryToVerify,
      unloadDate: verificationData.unloadDate,
      unloadEntryTime: verificationData.unloadEntryTime,
      unloadingLocation: unloadLocationName,
      unloadExitTime: verificationData.unloadExitTime,
      unloadPhoto: verificationData.unloadPhoto,
      status: 'UNLOADED',
    };

    setTransitFleet((prev) => prev.filter((l) => l.id !== id));
    setCompletedArchives((prev) => [...prev, closedTrip]);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        isSuperAdmin,
        isAuthenticated,
        isLoading,
        login,
        signUp,
        logout,
        getQuarryQueue,
        fetchQuarryQueue,
        checkInLorry,
        checkOutLorry,
        getIncomingFleet,
        fetchIncomingFleet,
        verifyAndCloseTrip,
        getCompletedArchives,
        materials,
        wheelTypes,
        locations,
        fetchConfigData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
