import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export const initDB = async (): Promise<void> => {
  _db = await SQLite.openDatabaseAsync('san_mines.db');

  // Create tables
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS local_trips (
      id TEXT PRIMARY KEY,
      vehicle_number TEXT NOT NULL,
      transporter_name TEXT NOT NULL,
      entry_time INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'INSIDE_QUARRY',
      is_synced INTEGER NOT NULL DEFAULT 0,
      server_id TEXT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox_queue (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      parent_local_id TEXT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_transit_cache (
      id TEXT PRIMARY KEY,
      trip_data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_quarry_cache (
      id TEXT PRIMARY KEY,
      trip_data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);

  // Migrations: add columns to existing tables if upgrading from v1 schema
  await _db.execAsync(`ALTER TABLE outbox_queue ADD COLUMN parent_local_id TEXT NULL`).catch(() => {});
  await _db.execAsync(`ALTER TABLE local_trips ADD COLUMN server_id TEXT NULL`).catch(() => {});
};

const db = (): SQLite.SQLiteDatabase => {
  if (!_db) throw new Error('SQLite DB not initialised. Call initDB() first.');
  return _db;
};

// ── local_trips helpers ──────────────────────────────────────────────────────

export interface LocalTrip {
  id: string;
  vehicle_number: string;
  transporter_name: string;
  entry_time: number;
  status: string;
  is_synced: number;
  server_id?: string | null;
  created_at: number;
}

export const insertLocalTrip = async (trip: LocalTrip): Promise<void> => {
  await db().runAsync(
    `INSERT OR REPLACE INTO local_trips
       (id, vehicle_number, transporter_name, entry_time, status, is_synced, server_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [trip.id, trip.vehicle_number, trip.transporter_name, trip.entry_time, trip.status, trip.is_synced, trip.server_id ?? null, trip.created_at]
  );
};

export const markTripSynced = async (localId: string): Promise<void> => {
  await db().runAsync(`UPDATE local_trips SET is_synced = 1 WHERE id = ?`, [localId]);
};

export const updateTripServerId = async (localId: string, serverId: string): Promise<void> => {
  await db().runAsync(`UPDATE local_trips SET server_id = ? WHERE id = ?`, [serverId, localId]);
};

// ── outbox_queue helpers ─────────────────────────────────────────────────────

export interface OutboxItem {
  id: string;
  idempotency_key: string;
  endpoint: string;
  method: string;
  payload: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  parent_local_id: string | null;
  created_at: number;
}

export const insertOutboxItem = async (item: Omit<OutboxItem, 'status'>): Promise<void> => {
  await db().runAsync(
    `INSERT OR IGNORE INTO outbox_queue
       (id, idempotency_key, endpoint, method, payload, status, parent_local_id, created_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
    [item.id, item.idempotency_key, item.endpoint, item.method, item.payload, item.parent_local_id ?? null, item.created_at]
  );
};

export const getPendingOutboxItems = async (): Promise<OutboxItem[]> => {
  return db().getAllAsync<OutboxItem>(
    `SELECT * FROM outbox_queue WHERE status = 'PENDING' ORDER BY created_at ASC`
  );
};

export const getOutboxItemById = async (id: string): Promise<OutboxItem | null> => {
  return db().getFirstAsync<OutboxItem>(`SELECT * FROM outbox_queue WHERE id = ?`, [id]);
};

export const getChildOutboxItems = async (parentLocalId: string): Promise<OutboxItem[]> => {
  return db().getAllAsync<OutboxItem>(
    `SELECT * FROM outbox_queue WHERE parent_local_id = ?`,
    [parentLocalId]
  );
};

export const updateOutboxStatus = async (id: string, status: OutboxItem['status']): Promise<void> => {
  await db().runAsync(`UPDATE outbox_queue SET status = ? WHERE id = ?`, [status, id]);
};

export const updateOutboxEndpoint = async (id: string, newEndpoint: string): Promise<void> => {
  await db().runAsync(`UPDATE outbox_queue SET endpoint = ? WHERE id = ?`, [newEndpoint, id]);
};

export const deleteOutboxItem = async (id: string): Promise<void> => {
  await db().runAsync(`DELETE FROM outbox_queue WHERE id = ?`, [id]);
};

export const getPendingCount = async (): Promise<number> => {
  const row = await db().getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM outbox_queue WHERE status IN ('PENDING', 'SYNCING')`
  );
  return row?.count ?? 0;
};

// ── local_transit_cache helpers ──────────────────────────────────────────────

export const cacheTransitTrips = async (trips: any[]): Promise<void> => {
  const d = db();
  for (const trip of trips) {
    await d.runAsync(
      `INSERT OR REPLACE INTO local_transit_cache (id, trip_data, cached_at) VALUES (?, ?, ?)`,
      [String(trip.id), JSON.stringify(trip), Date.now()]
    );
  }
};

export const getCachedTransitTrips = async (): Promise<any[]> => {
  const rows = await db().getAllAsync<{ trip_data: string }>(
    `SELECT trip_data FROM local_transit_cache ORDER BY cached_at ASC`
  );
  return rows.map((r) => JSON.parse(r.trip_data));
};

export const removeTransitCacheItem = async (id: string): Promise<void> => {
  await db().runAsync(`DELETE FROM local_transit_cache WHERE id = ?`, [id]);
};

// ── local_quarry_cache helpers ───────────────────────────────────────────────

export const cacheQuarryTrips = async (trips: any[]): Promise<void> => {
  const d = db();
  for (const trip of trips) {
    await d.runAsync(
      `INSERT OR REPLACE INTO local_quarry_cache (id, trip_data, cached_at) VALUES (?, ?, ?)`,
      [String(trip.id), JSON.stringify(trip), Date.now()]
    );
  }
};

export const cacheQuarryTrip = async (trip: any): Promise<void> => {
  await db().runAsync(
    `INSERT OR REPLACE INTO local_quarry_cache (id, trip_data, cached_at) VALUES (?, ?, ?)`,
    [String(trip.id), JSON.stringify(trip), Date.now()]
  );
};

export const getCachedQuarryTrips = async (): Promise<any[]> => {
  const rows = await db().getAllAsync<{ trip_data: string }>(
    `SELECT trip_data FROM local_quarry_cache ORDER BY cached_at ASC`
  );
  return rows.map((r) => JSON.parse(r.trip_data));
};

export const removeQuarryTripFromCache = async (id: string): Promise<void> => {
  await db().runAsync(`DELETE FROM local_quarry_cache WHERE id = ?`, [id]);
};
