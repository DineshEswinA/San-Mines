import NetInfo from '@react-native-community/netinfo';
import { getRequestHeaders, API_BASE_URL } from '../lib/api';
import { insertLocalTrip, insertOutboxItem } from '../db/sqlite';
import type { Role } from '../context/AuthContext';

export type SubmissionStatus = 'LIVE_SUCCESS' | 'SAVED_OFFLINE';

export interface SubmissionResult {
  status: SubmissionStatus;
  data?: any;
  message?: string;
}

interface SubmissionParams {
  endpoint: string;
  method: 'POST' | 'PUT';
  payload: Record<string, any>;
  userRole: Role;
  // Optional: links this outbox item as a child of an offline-created parent item (e.g. checkout depends on checkin)
  parentLocalId?: string;
  // Optional: localTripSnapshot for inserting into local_trips when going offline
  localTripSnapshot?: {
    vehicle_number: string;
    transporter_name: string;
    entry_time: number;
    status?: string;
  };
}

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const saveToOfflineQueue = async (
  params: SubmissionParams,
  clientUUID: string
): Promise<void> => {
  const idempotencyKey = `${params.endpoint}_${clientUUID}`;
  const now = Date.now();

  if (params.localTripSnapshot) {
    await insertLocalTrip({
      id: clientUUID,
      vehicle_number: params.localTripSnapshot.vehicle_number,
      transporter_name: params.localTripSnapshot.transporter_name,
      entry_time: params.localTripSnapshot.entry_time,
      status: params.localTripSnapshot.status ?? 'INSIDE_QUARRY',
      is_synced: 0,
      created_at: now,
    });
  }

  await insertOutboxItem({
    id: clientUUID,
    idempotency_key: idempotencyKey,
    endpoint: params.endpoint,
    method: params.method,
    payload: JSON.stringify(params.payload),
    parent_local_id: params.parentLocalId ?? null,
    created_at: now,
  });
};

export const handleDataSubmission = async (params: SubmissionParams): Promise<SubmissionResult> => {
  // ── SUPER_ADMIN guard: always live, never queue ───────────────────────────
  if (params.userRole === 'SUPER_ADMIN') {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      throw new Error(
        'Super Admin operations require a live internet connection to ensure system consistency.'
      );
    }
    const headers = await getRequestHeaders();
    const response = await fetch(`${API_BASE_URL}${params.endpoint}`, {
      method: params.method,
      headers,
      body: JSON.stringify(params.payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }
    return { status: 'LIVE_SUCCESS', data };
  }

  // ── Field operator flow ───────────────────────────────────────────────────
  const netState = await NetInfo.fetch();

  // isInternetReachable can be null on Android even with working internet.
  // Treat null as reachable — a real network failure will still be caught below.
  if (netState.isConnected && netState.isInternetReachable !== false) {
    // Path 1: Online — attempt live request with 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const headers = await getRequestHeaders();
      const response = await fetch(`${API_BASE_URL}${params.endpoint}`, {
        method: params.method,
        headers,
        body: JSON.stringify(params.payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      return { status: 'LIVE_SUCCESS', data };
    } catch (err: any) {
      clearTimeout(timeoutId);
      // Network drop or timeout — fall through to offline queue
      const clientUUID = generateUUID();
      await saveToOfflineQueue(params, clientUUID);
      return {
        status: 'SAVED_OFFLINE',
        message: 'Network unstable. Saved to device queue.',
        data: { localId: clientUUID },
      };
    }
  } else {
    // Path 2: Offline — save directly to local queue
    const clientUUID = generateUUID();
    await saveToOfflineQueue(params, clientUUID);
    return {
      status: 'SAVED_OFFLINE',
      message: 'Saved securely on device (Offline Mode).',
      data: { localId: clientUUID },
    };
  }
};
