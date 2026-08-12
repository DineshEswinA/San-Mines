import { AppState } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../lib/api';
import {
  getPendingOutboxItems,
  getOutboxItemById,
  getChildOutboxItems,
  updateOutboxStatus,
  updateOutboxEndpoint,
  deleteOutboxItem,
  markTripSynced,
  updateTripServerId,
  getPendingCount,
} from '../db/sqlite';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

type SyncStateCallback = (state: SyncState) => void;

let _isOnline = false;
let _isSyncing = false;
let _pendingCount = 0;
let _unsubscribeNetInfo: (() => void) | null = null;
const _subscribers = new Set<SyncStateCallback>();

const notifySubscribers = () => {
  const state: SyncState = { isOnline: _isOnline, isSyncing: _isSyncing, pendingCount: _pendingCount };
  _subscribers.forEach((fn) => fn(state));
};

const refreshPendingCount = async (): Promise<void> => {
  try {
    _pendingCount = await getPendingCount();
    notifySubscribers();
  } catch {
    // Non-critical
  }
};

export const processOfflineQueue = async (): Promise<void> => {
  if (_isSyncing) return;

  const pending = await getPendingOutboxItems();
  if (pending.length === 0) {
    await refreshPendingCount();
    return;
  }

  _isSyncing = true;
  _pendingCount = pending.length;
  notifySubscribers();

  let session;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch {
    _isSyncing = false;
    notifySubscribers();
    return;
  }

  if (!session?.access_token) {
    _isSyncing = false;
    notifySubscribers();
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };

  // Track parent IDs that were successfully synced this pass so children can proceed
  const syncedParentIds = new Set<string>();

  for (const item of pending) {
    // If this item depends on a parent that hasn't synced yet in this pass, skip it.
    // It will be processed in the next sync pass (after parent syncs and endpoint is rewritten).
    if (item.parent_local_id && !syncedParentIds.has(item.parent_local_id)) {
      continue;
    }

    // Re-read from DB to pick up any endpoint rewrites that happened this pass
    const effectiveItem = item.parent_local_id
      ? ((await getOutboxItemById(item.id)) ?? item)
      : item;

    try {
      await updateOutboxStatus(effectiveItem.id, 'SYNCING');

      const response = await fetch(`${API_BASE_URL}${effectiveItem.endpoint}`, {
        method: effectiveItem.method,
        headers: {
          ...authHeaders,
          'X-Idempotency-Key': effectiveItem.idempotency_key,
        },
        body: effectiveItem.payload,
      });

      if (response.ok) {
        let responseData: any = {};
        try { responseData = await response.json(); } catch { /* empty body is fine */ }

        // For checkin items: resolve parent → child dependency chain
        if (effectiveItem.endpoint === '/api/trips/checkin' && responseData?.trip?.id) {
          const serverTripId = String(responseData.trip.id);
          await updateTripServerId(effectiveItem.id, serverTripId);

          const children = await getChildOutboxItems(effectiveItem.id);
          for (const child of children) {
            // Rewrite endpoint: replace the client UUID with the real server integer ID
            const updatedEndpoint = child.endpoint.replace(effectiveItem.id, serverTripId);
            await updateOutboxEndpoint(child.id, updatedEndpoint);
          }

          syncedParentIds.add(effectiveItem.id);
        }

        await deleteOutboxItem(effectiveItem.id);
        await markTripSynced(effectiveItem.id);
      } else {
        // Server rejected the item — mark failed and move on to next
        await updateOutboxStatus(effectiveItem.id, 'FAILED');
      }
    } catch {
      // Network error — revert and stop; retry on next reconnection or app open
      await updateOutboxStatus(effectiveItem.id, 'PENDING');
      break;
    }
  }

  _isSyncing = false;
  await refreshPendingCount();
};

export const initSyncEngine = (): void => {
  if (_unsubscribeNetInfo) return; // already initialised

  let _wasOnline: boolean | null = null;

  // Network state listener — fires on connection changes
  _unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    const nowOnline = !!(state.isConnected && state.isInternetReachable);
    _isOnline = nowOnline;

    const wentOnline = _wasOnline === false && nowOnline;
    _wasOnline = nowOnline;

    notifySubscribers();

    if (wentOnline) {
      processOfflineQueue();
    } else if (nowOnline) {
      refreshPendingCount();
    }
  });

  // AppState listener — fires when the user opens or foregrounds the app.
  // Ensures pending items sync even if the device was already online (no reconnection event).
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && _isOnline) {
      processOfflineQueue();
    }
  });
};

export const teardownSyncEngine = (): void => {
  if (_unsubscribeNetInfo) {
    _unsubscribeNetInfo();
    _unsubscribeNetInfo = null;
  }
};

export const subscribeSyncState = (fn: SyncStateCallback): void => {
  _subscribers.add(fn);
};

export const unsubscribeSyncState = (fn: SyncStateCallback): void => {
  _subscribers.delete(fn);
};

export const getSyncState = (): SyncState => ({
  isOnline: _isOnline,
  isSyncing: _isSyncing,
  pendingCount: _pendingCount,
});
