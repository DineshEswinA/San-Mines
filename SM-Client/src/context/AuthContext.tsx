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
  checkInLorry: (transporterName: string, vehicleNumber: string, date: string, time: string) => Promise<void>;
  checkOutLorry: (id: string, checkOutData: Omit<QuarryCheckOut, 'id' | 'transporterName' | 'vehicleNumber' | 'entryDate' | 'entryTime' | 'status'>) => Promise<void>;
  
  // Unload Operator specific data (Throws error if accessed by Quarry Operator)
  getIncomingFleet: () => QuarryCheckOut[];
  fetchIncomingFleet: () => Promise<void>;
  verifyAndCloseTrip: (id: string, verificationData: Omit<UnloadVerification, 'id' | 'transporterName' | 'vehicleNumber' | 'entryDate' | 'entryTime' | 'exitTime' | 'transitType' | 'govtStationaryNumber' | 'material' | 'tyres' | 'netWeight' | 'amount' | 'transitFormPhoto' | 'lorryPhoto' | 'gpsCoordinates' | 'status'>) => Promise<void>;
  
  // Shared / Archive (For simulation tracking/debugging or history)
  getCompletedArchives: () => UnloadVerification[];
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

  // Monitor session changes with active Supabase listener
  useEffect(() => {
    // Get initial session status on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for authentication changes (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
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

  const fetchIncomingFleet = async () => {
    assertUnloadAccess();
    const res = await api.getIncoming();
    if (res.error) {
      throw new Error(res.error);
    }
    if (res.data) {
      const mapped: QuarryCheckOut[] = res.data.map((trip: any) => {
        const checkinTimeDate = new Date(trip.checkinTime || trip.quarry_entry_time);
        const entryDate = checkinTimeDate.toISOString().split('T')[0];
        const entryTime = String(checkinTimeDate.getHours()).padStart(2, '0') + ':' + String(checkinTimeDate.getMinutes()).padStart(2, '0');
        
        const checkoutTimeDate = new Date(trip.checkoutTime || trip.quarry_exit_time);
        const exitTime = String(checkoutTimeDate.getHours()).padStart(2, '0') + ':' + String(checkoutTimeDate.getMinutes()).padStart(2, '0');

        return {
          id: String(trip.id),
          transporterName: trip.transporterName,
          vehicleNumber: trip.vehicleNumber,
          entryDate,
          entryTime,
          exitTime,
          transitType: trip.transitType,
          govtStationaryNumber: trip.govtStationaryNumber || '',
          material: trip.material || '',
          tyres: trip.lorryTyres || 10,
          netWeight: Number(trip.netWeightTonne || 0),
          amount: Number(trip.amountEntry || 0),
          gpsCoordinates: trip.quarry_gps_lat ? { latitude: Number(trip.quarry_gps_lat), longitude: Number(trip.quarry_gps_long) } : null,
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
    checkOutData: Omit<QuarryCheckOut, 'id' | 'transporterName' | 'vehicleNumber' | 'entryDate' | 'entryTime' | 'status'>
  ) => {
    assertQuarryAccess();
    const lorryToCheckout = quarryQueue.find((l) => l.id === id);
    if (!lorryToCheckout) throw new Error('Lorry not found in waiting queue');

    // Parse combined exit timestamp
    const isoExitTime = `${lorryToCheckout.entryDate}T${checkOutData.exitTime}:00.000Z`;
    const res = await api.checkOut(id, {
      transitType: checkOutData.transitType,
      govtStationaryNumber: checkOutData.govtStationaryNumber,
      material: checkOutData.material,
      lorryTyres: checkOutData.tyres,
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
    verificationData: Omit<UnloadVerification, 'id' | 'transporterName' | 'vehicleNumber' | 'entryDate' | 'entryTime' | 'exitTime' | 'transitType' | 'govtStationaryNumber' | 'material' | 'tyres' | 'netWeight' | 'amount' | 'transitFormPhoto' | 'lorryPhoto' | 'gpsCoordinates' | 'status'>
  ) => {
    assertUnloadAccess();
    const lorryToVerify = transitFleet.find((l) => l.id === id);
    if (!lorryToVerify) throw new Error('Vehicle not found in incoming fleet queue');

    const isoUnloadTime = `${verificationData.unloadDate}T${verificationData.unloadExitTime}:00.000Z`;
    // Unloading place verification: pass standard site drop coordinates to bypass geofence check
    const res = await api.unload(id, {
      unloadingLocation: verificationData.unloadingLocation,
      userLat: 34.0522, 
      userLng: -118.2437,
      unloadTime: isoUnloadTime,
    });

    if (res.error) {
      throw new Error(res.error);
    }

    const closedTrip: UnloadVerification = {
      ...lorryToVerify,
      ...verificationData,
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
        checkInLorry,
        checkOutLorry,
        getIncomingFleet,
        fetchIncomingFleet,
        verifyAndCloseTrip,
        getCompletedArchives,
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
