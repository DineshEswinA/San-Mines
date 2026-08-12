import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatTimeTo12Hour, formatDateOnly } from '../utils/format';
import { handleDataSubmission, type SubmissionResult } from '../services/DataService';
import {
  cacheQuarryTrip,
  cacheQuarryTrips,
  getCachedQuarryTrips,
  removeQuarryTripFromCache,
  cacheTransitTrips,
  getCachedTransitTrips,
  removeTransitCacheItem,
} from '../db/sqlite';

// Changes each time the JS bundle loads (i.e., each cold app start).
// Used to invalidate the config cache between launches without an explicit clear.
const CURRENT_SESSION_ID = String(Date.now());
const CONFIG_SESSION_KEY = 'config_session_id';
const CONFIG_MATERIALS_KEY = 'config_materials';
const CONFIG_WHEEL_TYPES_KEY = 'config_wheel_types';
const CONFIG_LOCATIONS_KEY = 'config_locations';

// Re-export so existing screens that import from AuthContext keep working
export { formatTimeTo12Hour, formatDateOnly } from '../utils/format';

export type Role = 'QUARRY_OPERATOR' | 'UNLOAD_OPERATOR' | 'SUPER_ADMIN';

export interface QuarryCheckIn {
  id: string;
  transporterName: string;
  vehicleNumber: string;
  entryTime: number;
  status: 'INSIDE_QUARRY' | 'IN_TRANSIT' | 'UNLOADED';
  syncStatus?: 'PENDING' | 'SYNCED';
}

export interface QuarryCheckOut extends Omit<QuarryCheckIn, 'status'> {
  exitTime: number;
  transitType: 'MANUAL' | 'DIGITAL';
  govtStationaryNumber?: string;
  material: string;
  tyres: number;
  netWeight: number;
  amount: number;
  transitFormPhoto: string | null;
  vehiclePhoto: string | null;
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
  unloadPhoto: string | null;
  status: 'UNLOADED';
}

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  forgotPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  logout: () => Promise<{ error: string | null }>;
  // Quarry Operator specific data (Throws error if accessed by Unloading Operator)
  getQuarryQueue: () => QuarryCheckIn[];
  fetchQuarryQueue: () => Promise<void>;
  checkInVehicle: (transporterName: string, vehicleNumber: string, date: string, time: string) => Promise<SubmissionResult>;
  checkOutVehicle: (
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
      vehiclePhoto?: string;
      gpsCoordinates: {
        latitude: number;
        longitude: number;
      } | null;
    }
  ) => Promise<SubmissionResult>;

  // Unload Operator specific data (Throws error if accessed by Quarry Operator)
  getIncomingFleet: () => QuarryCheckOut[];
  fetchTransitFleet: () => Promise<void>;
  fetchCompletedArchives: () => Promise<void>;
  verifyAndCloseTrip: (
    id: string,
    verificationData: {
      unloadDate: string;
      unloadEntryTime: string;
      unloadingLocationId: number;
      unloadExitTime?: string;
      unloadPhoto?: string;
    }
  ) => Promise<SubmissionResult>;

  // Shared / Archive (For simulation tracking/debugging or history)
  getCompletedArchives: () => UnloadVerification[];

  // Configurations
  materials: any[];
  wheelTypes: any[];
  locations: any[];
  fetchConfigData: (force?: boolean) => Promise<void>;

  // Local Memory Updaters for instant UI reflection without GET requests
  addLocationState: (location: any) => void;
  updateLocationState: (id: number, location: any) => void;
  removeLocationState: (id: number) => void;

  addMaterialState: (material: any) => void;
  updateMaterialState: (id: number, material: any) => void;
  removeMaterialState: (id: number) => void;

  addWheelTypeState: (wheelType: any) => void;
  updateWheelTypeState: (id: number, wheelType: any) => void;
  removeWheelTypeState: (id: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('QUARRY_OPERATOR');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Keep separate state arrays for strict data isolation
  const [quarryQueue, setQuarryQueue] = useState<QuarryCheckIn[]>([]);
  const [transitFleet, setTransitFleet] = useState<QuarryCheckOut[]>([]);
  const [completedArchives, setCompletedArchives] = useState<UnloadVerification[]>([]);

  // Configuration Lookups State
  const [materials, setMaterials] = useState<any[]>([]);
  const [wheelTypes, setWheelTypes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Local Memory Mutation Helpers
  const addLocationState = (location: any) => {
    setLocations((prev) => [location, ...prev]);
  };
  const updateLocationState = (id: number, updated: any) => {
    setLocations((prev) => prev.map((l) => (Number(l.id) === Number(id) ? { ...l, ...updated } : l)));
  };
  const removeLocationState = (id: number) => {
    setLocations((prev) => prev.filter((l) => Number(l.id) !== Number(id)));
  };

  const addMaterialState = (material: any) => {
    setMaterials((prev) => [...prev, material]);
  };
  const updateMaterialState = (id: number, updated: any) => {
    setMaterials((prev) => prev.map((m) => (Number(m.id) === Number(id) ? { ...m, ...updated } : m)));
  };
  const removeMaterialState = (id: number) => {
    setMaterials((prev) => prev.filter((m) => Number(m.id) !== Number(id)));
  };

  const addWheelTypeState = (wheelType: any) => {
    setWheelTypes((prev) => [...prev, wheelType].sort((a, b) => a.wheel_count - b.wheel_count));
  };
  const updateWheelTypeState = (id: number, updated: any) => {
    setWheelTypes((prev) => prev.map((w) => (Number(w.id) === Number(id) ? { ...w, ...updated } : w)));
  };
  const removeWheelTypeState = (id: number) => {
    setWheelTypes((prev) => prev.filter((w) => Number(w.id) !== Number(id)));
  };

  const fetchConfigData = async (force: boolean = false) => {
    if (!force && materials.length > 0 && wheelTypes.length > 0 && locations.length > 0) {
      return;
    }

    // Try to hydrate from this session's AsyncStorage cache before hitting the network
    if (!force) {
      try {
        const sessionId = await AsyncStorage.getItem(CONFIG_SESSION_KEY);
        if (sessionId === CURRENT_SESSION_ID) {
          const [mData, wData, lData] = await Promise.all([
            AsyncStorage.getItem(CONFIG_MATERIALS_KEY),
            AsyncStorage.getItem(CONFIG_WHEEL_TYPES_KEY),
            AsyncStorage.getItem(CONFIG_LOCATIONS_KEY),
          ]);
          if (mData && wData && lData) {
            setMaterials(JSON.parse(mData));
            setWheelTypes(JSON.parse(wData));
            setLocations(JSON.parse(lData));
            return;
          }
        }
      } catch (e) {
        // Cache miss — fall through to network fetch
      }
    }

    const [mRes, wRes, lRes] = await Promise.all([
      api.getMaterials(),
      api.getWheelTypes(),
      api.getLocations(),
    ]);

    const newMaterials = mRes.data ?? [];
    const newWheelTypes = wRes.data ?? [];
    const newLocations = lRes.data ?? [];

    if (mRes.data) setMaterials(newMaterials);
    if (wRes.data) setWheelTypes(newWheelTypes);
    if (lRes.data) setLocations(newLocations);

    // Persist to session cache so subsequent screen navigations skip the network
    try {
      await AsyncStorage.setItem(CONFIG_SESSION_KEY, CURRENT_SESSION_ID);
      if (mRes.data) await AsyncStorage.setItem(CONFIG_MATERIALS_KEY, JSON.stringify(newMaterials));
      if (wRes.data) await AsyncStorage.setItem(CONFIG_WHEEL_TYPES_KEY, JSON.stringify(newWheelTypes));
      if (lRes.data) await AsyncStorage.setItem(CONFIG_LOCATIONS_KEY, JSON.stringify(newLocations));
    } catch (e) {
      // Non-critical — caching failure doesn't block the app
    }
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
        setIsLoading(true);
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
      console.log("access_token - " + session?.access_token);

    }).catch(() => {
      if (active) setIsLoading(false);
    });

    // Listen for authentication changes (login, logout, refresh token, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }
      if (_event === 'USER_UPDATED') {
        setIsPasswordRecovery(false);
      }
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

  const forgotPassword = async (email: string): Promise<{ error: string | null }> => {
    if (!isConfigured()) {
      return { error: 'Supabase credentials are not configured.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'sanmines://change-password',
    });
    return { error: error ? error.message : null };
  };

  const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setIsPasswordRecovery(false);
    }
    return { error: error ? error.message : null };
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'user_role',
        CONFIG_SESSION_KEY,
        CONFIG_MATERIALS_KEY,
        CONFIG_WHEEL_TYPES_KEY,
        CONFIG_LOCATIONS_KEY,
      ]);
    } catch (err) {
      console.error('Failed to clear storage on logout:', err);
    }
    setMaterials([]);
    setWheelTypes([]);
    setLocations([]);
    setQuarryQueue([]);
    setTransitFleet([]);
    setCompletedArchives([]);
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
    const res = await api.getTrips('INSIDE_QUARRY');
    if (res.error) {
      // Offline or server error — fall back to SQLite cache
      try {
        const cached = await getCachedQuarryTrips();
        if (cached.length > 0) setQuarryQueue(cached as QuarryCheckIn[]);
      } catch {
        // Cache unavailable; keep current state
      }
      return;
    }
    if (res.data && res.data.trips) {
      const mapped: QuarryCheckIn[] = res.data.trips.map((trip: any) => ({
        id: String(trip.id),
        transporterName: trip.transporterName,
        vehicleNumber: trip.vehicleNumber,
        entryTime: Number(trip.quarryEntryTime),
        status: trip.status || 'INSIDE_QUARRY',
      }));
      setQuarryQueue(mapped);
      try { await cacheQuarryTrips(mapped); } catch { /* non-critical */ }
    }
  };

  const extractTimePart = (isoStr: string | null): string => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const mapTripBase = (trip: any) => {
    const mat = materials.find(m => Number(m.id) === Number(trip.materialId));
    const wheel = wheelTypes.find(w => Number(w.id) === Number(trip.wheelTypeId));
    return {
      id: String(trip.id),
      transporterName: trip.transporterName,
      vehicleNumber: trip.vehicleNumber,
      entryTime: Number(trip.quarryEntryTime),
      exitTime: Number(trip.quarryExitTime),
      transitType: trip.transitType,
      govtStationaryNumber: trip.govtStationaryNumber || '',
      material: mat ? mat.display_name : `Material #${trip.materialId}`,
      tyres: wheel ? wheel.wheel_count : 10,
      netWeight: Number(trip.netWeightTonne || 0),
      amount: Number(trip.amountEntry || 0),
      gpsCoordinates: trip.quarryGpsLat
        ? { latitude: Number(trip.quarryGpsLat), longitude: Number(trip.quarryGpsLong) }
        : null,
      transitFormPhoto: trip.transitFormPhotoUrl || null,
      vehiclePhoto: trip.vehiclePhotoUrl || null,
    };
  };

  const fetchTransitFleet = async () => {
    assertUnloadAccess();
    if (materials.length === 0 || wheelTypes.length === 0 || locations.length === 0) {
      await fetchConfigData();
    }
    const res = await api.getTrips('IN_TRANSIT');
    if (res.error) {
      // Offline or server error — fall back to SQLite cache
      try {
        const cached = await getCachedTransitTrips();
        if (cached.length > 0) setTransitFleet(cached as QuarryCheckOut[]);
      } catch {
        // Cache unavailable; keep current state
      }
      return;
    }
    if (res.data && res.data.trips) {
      const mapped: QuarryCheckOut[] = res.data.trips.map((trip: any) => ({
        ...mapTripBase(trip),
        status: 'IN_TRANSIT' as const,
      }));
      setTransitFleet(mapped);
      try { await cacheTransitTrips(mapped); } catch { /* non-critical */ }
    }
  };

  const fetchCompletedArchives = async () => {
    assertUnloadAccess();
    if (materials.length === 0 || wheelTypes.length === 0 || locations.length === 0) {
      await fetchConfigData();
    }
    const res = await api.getTrips('UNLOADED');
    if (res.error) throw new Error(res.error);
    if (res.data && res.data.trips) {
      const mapped: UnloadVerification[] = res.data.trips.map((trip: any) => {
        const loc = locations.find(l => Number(l.id) === Number(trip.unloadingLocationId));
        return {
          ...mapTripBase(trip),
          status: 'UNLOADED' as const,
          unloadDate: formatDateOnly(trip.unloadDate || trip.unloadEntryTime),
          unloadEntryTime: extractTimePart(trip.unloadEntryTime),
          unloadingLocation: loc ? loc.name : `Unload Site #${trip.unloadingLocationId}`,
          unloadExitTime: extractTimePart(trip.unloadExitTime),
          unloadPhoto: trip.unloadingPhotoUrl || null,
        };
      });
      setCompletedArchives(mapped);
    }
  };

  const checkInVehicle = async (transporterName: string, vehicleNumber: string, date: string, time: string): Promise<SubmissionResult> => {
    assertQuarryAccess();
    const isoDateTime = `${date}T${time}:00.000Z`;
    const entryTimestamp = new Date(isoDateTime).getTime() || Date.now();

    const result = await handleDataSubmission({
      endpoint: '/api/trips/checkin',
      method: 'POST',
      payload: {
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        transporterName: transporterName.trim(),
        quarryEntryTime: isoDateTime,
      },
      userRole: role,
      localTripSnapshot: {
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        transporter_name: transporterName.trim(),
        entry_time: entryTimestamp,
        status: 'INSIDE_QUARRY',
      },
    });

    if (result.status === 'LIVE_SUCCESS' && result.data?.trip) {
      const serverTrip = result.data.trip;
      setQuarryQueue((prev) => [
        ...prev,
        {
          id: String(serverTrip.id),
          transporterName: serverTrip.transporterName,
          vehicleNumber: serverTrip.vehicleNumber,
          entryTime: Number(serverTrip.quarryEntryTime),
          status: 'INSIDE_QUARRY' as const,
        },
      ]);
    } else if (result.status === 'SAVED_OFFLINE' && result.data?.localId) {
      const offlineTrip: QuarryCheckIn = {
        id: result.data.localId,
        transporterName: transporterName.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        entryTime: entryTimestamp,
        status: 'INSIDE_QUARRY',
        syncStatus: 'PENDING',
      };
      // Add synthetic entry to queue state so the card appears immediately
      setQuarryQueue((prev) => [...prev, offlineTrip]);
      // Persist to SQLite quarry cache so it survives an app restart while offline
      try { await cacheQuarryTrip(offlineTrip); } catch { /* non-critical */ }
    }

    return result;
  };

  const checkOutVehicle = async (
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
      vehiclePhoto?: string;
      gpsCoordinates: {
        latitude: number;
        longitude: number;
      } | null;
    }
  ): Promise<SubmissionResult> => {
    assertQuarryAccess();
    const vehicleToCheckout = quarryQueue.find((v) => v.id === id);
    if (!vehicleToCheckout) throw new Error('Vehicle not found in waiting queue');

    // Client-UUID IDs (contain '-') are locally-created trips pending server sync.
    // We queue the checkout with a parent_local_id dependency so SyncEngine
    // rewrites the endpoint with the real server ID before processing it.
    const isPendingParent = id.includes('-') && vehicleToCheckout.syncStatus === 'PENDING';

    const entryDate = formatDateOnly(vehicleToCheckout.entryTime);
    const isoExitTime = `${entryDate}T${checkOutData.exitTime}:00.000Z`;

    const payload = {
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
      transitFormPhotoUrl: checkOutData.transitFormPhoto,
      vehiclePhotoUrl: checkOutData.vehiclePhoto,
    };

    const result = await handleDataSubmission({
      endpoint: `/api/trips/checkout/${id}`,
      method: 'PUT',
      payload,
      userRole: role,
      // Wire the dependency chain: if checkin was offline, checkout must wait for its sync
      parentLocalId: isPendingParent ? id : undefined,
    });

    if (result.status === 'LIVE_SUCCESS') {
      setQuarryQueue((prev) => prev.filter((v) => v.id !== id));
      try { await removeQuarryTripFromCache(id); } catch { /* non-critical */ }
    }
    // On SAVED_OFFLINE: keep the vehicle in queue so the operator can see it's pending

    return result;
  };

  const verifyAndCloseTrip = async (
    id: string,
    verificationData: {
      unloadDate: string;
      unloadEntryTime: string;
      unloadingLocationId: number;
      unloadExitTime?: string;
      unloadPhoto?: string;
    }
  ): Promise<SubmissionResult> => {
    assertUnloadAccess();
    const vehicleToVerify = transitFleet.find((v) => v.id === id);
    if (!vehicleToVerify) throw new Error('Vehicle not found in incoming fleet queue');

    const finalExitTime = verificationData.unloadExitTime || verificationData.unloadEntryTime;
    const isoUnloadEntryTime = `${verificationData.unloadDate}T${verificationData.unloadEntryTime}:00.000Z`;
    const isoUnloadExitTime = `${verificationData.unloadDate}T${finalExitTime}:00.000Z`;

    const selectedLoc = locations.find(l => l.id === verificationData.unloadingLocationId);
    const userLat = selectedLoc ? Number(selectedLoc.latitude) : 12.971600;
    const userLng = selectedLoc ? Number(selectedLoc.longitude) : 77.594600;

    const payload = {
      unloadingLocationId: verificationData.unloadingLocationId,
      userLat,
      userLng,
      unloadEntryTime: isoUnloadEntryTime,
      unloadExitTime: isoUnloadExitTime,
      unloadDate: verificationData.unloadDate,
      unloadingPhotoUrl: verificationData.unloadPhoto,
    };

    const result = await handleDataSubmission({
      endpoint: `/api/trips/unload/${id}`,
      method: 'PUT',
      payload,
      userRole: role,
    });

    if (result.status === 'LIVE_SUCCESS') {
      const unloadLocationName = selectedLoc ? selectedLoc.name : `Unload Site #${verificationData.unloadingLocationId}`;
      const closedTrip: UnloadVerification = {
        ...vehicleToVerify,
        unloadDate: verificationData.unloadDate,
        unloadEntryTime: verificationData.unloadEntryTime,
        unloadingLocation: unloadLocationName,
        unloadExitTime: finalExitTime,
        unloadPhoto: verificationData.unloadPhoto || null,
        status: 'UNLOADED',
      };
      setTransitFleet((prev) => prev.filter((v) => v.id !== id));
      setCompletedArchives((prev) => [...prev, closedTrip]);
      try { await removeTransitCacheItem(id); } catch { /* non-critical */ }
    }
    // On SAVED_OFFLINE: keep vehicle in transit fleet until sync confirms closure

    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        isSuperAdmin,
        isAuthenticated,
        isLoading,
        isPasswordRecovery,
        login,
        forgotPassword,
        updatePassword,
        logout,
        getQuarryQueue,
        fetchQuarryQueue,
        checkInVehicle,
        checkOutVehicle,
        getIncomingFleet,
        fetchTransitFleet,
        fetchCompletedArchives,
        verifyAndCloseTrip,
        getCompletedArchives,
        materials,
        wheelTypes,
        locations,
        fetchConfigData,
        addLocationState,
        updateLocationState,
        removeLocationState,
        addMaterialState,
        updateMaterialState,
        removeMaterialState,
        addWheelTypeState,
        updateWheelTypeState,
        removeWheelTypeState,
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
