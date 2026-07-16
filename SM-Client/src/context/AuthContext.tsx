import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export type Role = 'QUARRY_OPERATOR' | 'UNLOAD_OPERATOR';

export interface QuarryCheckIn {
  id: string;
  transporterName: string;
  vehicleNumber: string;
  entryDate: string;
  entryTime: string;
  status: 'INSIDE_QUARRY' | 'IN_TRANSIT' | 'UNLOADED';
}

export interface QuarryCheckOut extends Omit<QuarryCheckIn, 'status'> {
  exitTime: string;
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
  isAuthenticated: boolean;
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

// Initial Seed Data for immediate interactive feel
const INITIAL_QUARRY_QUEUE: QuarryCheckIn[] = [
  {
    id: 'TRIP-101',
    transporterName: 'Delta Logistics',
    vehicleNumber: 'MH-12-PQ-9876',
    entryDate: '2026-07-04',
    entryTime: '08:30',
    status: 'INSIDE_QUARRY',
  },
  {
    id: 'TRIP-102',
    transporterName: 'Vanguard Transports',
    vehicleNumber: 'KA-51-AB-1234',
    entryDate: '2026-07-04',
    entryTime: '09:15',
    status: 'INSIDE_QUARRY',
  },
];

const INITIAL_TRANSIT_FLEET: QuarryCheckOut[] = [
  {
    id: 'TRIP-201',
    transporterName: 'Falcon Bulk Carriers',
    vehicleNumber: 'DL-01-XY-5678',
    entryDate: '2026-07-04',
    entryTime: '07:00',
    exitTime: '07:45',
    transitType: 'DIGITAL',
    govtStationaryNumber: 'GOV-9921-A',
    material: 'Crushed Stone (20mm)',
    tyres: 12,
    netWeight: 28.5,
    amount: 1420,
    gpsCoordinates: { latitude: 19.076, longitude: 72.877 },
    status: 'IN_TRANSIT',
  },
  {
    id: 'TRIP-202',
    transporterName: 'Apex Earthmovers',
    vehicleNumber: 'HR-55-ZZ-3456',
    entryDate: '2026-07-04',
    entryTime: '07:30',
    exitTime: '08:15',
    transitType: 'MANUAL',
    govtStationaryNumber: '',
    material: 'River Sand',
    tyres: 10,
    netWeight: 24.2,
    amount: 1100,
    gpsCoordinates: { latitude: 28.6139, longitude: 77.209 },
    status: 'IN_TRANSIT',
  },
];

const INITIAL_ARCHIVES: UnloadVerification[] = [
  {
    id: 'TRIP-301',
    transporterName: 'Titan Freight',
    vehicleNumber: 'GJ-03-CC-4433',
    entryDate: '2026-07-04',
    entryTime: '06:00',
    exitTime: '06:40',
    transitType: 'DIGITAL',
    govtStationaryNumber: 'GOV-8812-B',
    material: 'Granite Dust',
    tyres: 14,
    netWeight: 32.1,
    amount: 1650,
    gpsCoordinates: { latitude: 23.0225, longitude: 72.5714 },
    status: 'UNLOADED',
    unloadDate: '2026-07-04',
    unloadEntryTime: '08:10',
    unloadingLocation: 'Metro Extension Site B',
    unloadExitTime: '08:45',
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('QUARRY_OPERATOR');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Keep separate state arrays for strict data isolation
  const [quarryQueue, setQuarryQueue] = useState<QuarryCheckIn[]>(INITIAL_QUARRY_QUEUE);
  const [transitFleet, setTransitFleet] = useState<QuarryCheckOut[]>(INITIAL_TRANSIT_FLEET);
  const [completedArchives, setCompletedArchives] = useState<UnloadVerification[]>(INITIAL_ARCHIVES);

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
    // Get initial session status on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchConfigData();
      }
    });

    // Listen for authentication changes (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchConfigData();
      }
    });

    return () => {
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
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  };

  // Security Access Guards
  const assertQuarryAccess = () => {
    if (role !== 'QUARRY_OPERATOR') {
      throw new Error(`Security Violation: Unloading Operator tried to access Quarry Operator memory.`);
    }
  };

  const assertUnloadAccess = () => {
    if (role !== 'UNLOAD_OPERATOR') {
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
    const res = await api.getTrips('INSIDE_QUARRY');
    if (res.error) {
      throw new Error(res.error);
    }
    if (res.data && res.data.trips) {
      const mapped: QuarryCheckIn[] = res.data.trips.map((trip: any) => {
        const checkinTimeDate = new Date(trip.quarryEntryTime);
        const entryDate = trip.quarryEntryDate || checkinTimeDate.toISOString().split('T')[0];
        const entryTime = String(checkinTimeDate.getHours()).padStart(2, '0') + ':' + String(checkinTimeDate.getMinutes()).padStart(2, '0');

        return {
          id: String(trip.id),
          transporterName: trip.transporterName,
          vehicleNumber: trip.vehicleNumber,
          entryDate,
          entryTime,
          status: 'INSIDE_QUARRY',
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
    const res = await api.getIncoming();
    if (res.error) {
      throw new Error(res.error);
    }
    if (res.data) {
      const mapped: QuarryCheckOut[] = res.data.map((trip: any) => {
        const checkinTimeDate = new Date(trip.quarryEntryTime || trip.quarry_entry_time);
        const entryDate = checkinTimeDate.toISOString().split('T')[0];
        const entryTime = String(checkinTimeDate.getHours()).padStart(2, '0') + ':' + String(checkinTimeDate.getMinutes()).padStart(2, '0');
        
        const checkoutTimeDate = new Date(trip.quarryExitTime || trip.quarry_exit_time);
        const exitTime = String(checkoutTimeDate.getHours()).padStart(2, '0') + ':' + String(checkoutTimeDate.getMinutes()).padStart(2, '0');

        const mat = materials.find(m => m.id === trip.materialId);
        const materialDisplayName = mat ? mat.display_name : `Material #${trip.materialId}`;

        const wheel = wheelTypes.find(w => w.id === trip.wheelTypeId);
        const tyreCount = wheel ? wheel.wheel_count : 10;

        return {
          id: String(trip.id),
          transporterName: trip.transporterName,
          vehicleNumber: trip.vehicleNumber,
          entryDate,
          entryTime,
          exitTime,
          transitType: trip.transitType,
          govtStationaryNumber: trip.govtStationaryNumber || '',
          material: materialDisplayName,
          tyres: tyreCount,
          netWeight: Number(trip.netWeightTonne || 0),
          amount: Number(trip.amountEntry || 0),
          gpsCoordinates: trip.quarryGpsLat ? { latitude: Number(trip.quarryGpsLat), longitude: Number(trip.quarryGpsLong) } : null,
          status: 'IN_TRANSIT',
        };
      });
      setTransitFleet(mapped);
    }
  };

  const checkInLorry = async (transporterName: string, vehicleNumber: string, date: string, time: string) => {
    assertQuarryAccess();
    // Parse combined checkin timestamp into ISO standard format
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
        entryDate: date,
        entryTime: time,
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
    const isoExitTime = `${lorryToCheckout.entryDate}T${checkOutData.exitTime}:00.000Z`;
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
      checkoutTime: isoExitTime,
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
        isAuthenticated,
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
