import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initDB } from '../db/sqlite';
import {
  initSyncEngine,
  teardownSyncEngine,
  subscribeSyncState,
  unsubscribeSyncState,
  getSyncState,
  type SyncState,
} from '../services/SyncEngine';

interface OfflineContextType {
  isOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  isDbReady: boolean;
}

const OfflineContext = createContext<OfflineContextType>({
  isOffline: false,
  isSyncing: false,
  pendingCount: 0,
  isDbReady: false,
});

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
  });
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await initDB();
        if (!mounted) return;
        setIsDbReady(true);

        initSyncEngine();

        // Hydrate initial state and subscribe to changes
        setSyncState(getSyncState());
        const handleStateChange = (s: SyncState) => {
          if (mounted) setSyncState(s);
        };
        subscribeSyncState(handleStateChange);

        return () => {
          unsubscribeSyncState(handleStateChange);
          teardownSyncEngine();
        };
      } catch (err) {
        console.error('[OfflineContext] Bootstrap failed:', err);
      }
    };

    const cleanup = bootstrap();

    return () => {
      mounted = false;
      cleanup.then((fn) => fn?.());
    };
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOffline: !syncState.isOnline,
        isSyncing: syncState.isSyncing,
        pendingCount: syncState.pendingCount,
        isDbReady,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOfflineStatus = (): OfflineContextType => useContext(OfflineContext);
