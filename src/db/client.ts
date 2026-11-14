import * as SQLite from "expo-sqlite";

import { SCHEMA_SQL, SEED_BATCHES, SEED_LOCATIONS } from "./schema";

const DATABASE_NAME = "classvault.db";
const LEGACY_BATCH_NAME = "A/L Revision";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await database.execAsync("PRAGMA journal_mode = WAL;");
  await database.execAsync(SCHEMA_SQL);
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `DELETE FROM sync_status
       WHERE entity_type = 'PAYMENT'
         AND entity_id IN (
           SELECT p.id FROM payments p
           JOIN class_sessions cs ON cs.id = p.session_id
           JOIN batches b ON b.id = cs.batch_id
           WHERE b.name = ?
         )`,
      LEGACY_BATCH_NAME,
    );
    await database.runAsync(
      `DELETE FROM sync_status
       WHERE entity_type = 'CLASS_SESSION'
         AND entity_id IN (
           SELECT cs.id FROM class_sessions cs
           JOIN batches b ON b.id = cs.batch_id
           WHERE b.name = ?
         )`,
      LEGACY_BATCH_NAME,
    );
    await database.runAsync(
      `DELETE FROM sync_status
       WHERE entity_type = 'STUDENT'
         AND entity_id IN (
           SELECT s.id FROM students s
           JOIN batches b ON b.id = s.batch_id
           WHERE b.name = ?
         )`,
      LEGACY_BATCH_NAME,
    );
    await database.runAsync(
      `DELETE FROM sync_status
       WHERE entity_type = 'BATCH'
         AND entity_id IN (SELECT id FROM batches WHERE name = ?)`,
      LEGACY_BATCH_NAME,
    );
    await database.runAsync(
      "DELETE FROM students WHERE batch_id IN (SELECT id FROM batches WHERE name = ?)",
      LEGACY_BATCH_NAME,
    );
    await database.runAsync(
      "DELETE FROM batches WHERE name = ?",
      LEGACY_BATCH_NAME,
    );

    for (const locationName of SEED_LOCATIONS) {
      await database.runAsync(
        "INSERT OR IGNORE INTO locations (name) VALUES (?)",
        locationName,
      );
    }

    const locations = await database.getAllAsync<{ id: number; name: string }>(
      "SELECT id, name FROM locations WHERE name IN (?, ?)",
      ...SEED_LOCATIONS,
    );

    for (const location of locations) {
      for (const [index, batchName] of SEED_BATCHES.entries()) {
        await database.runAsync(
          "INSERT OR IGNORE INTO batches (location_id, name, default_fee, sort_order) VALUES (?, ?, ?, ?)",
          location.id,
          batchName,
          800,
          index + 1,
        );
      }
    }

    if (locations.length !== SEED_LOCATIONS.length) {
      throw new Error("Default teaching locations could not be initialized.");
    }
  });

  const seedCheck = await database.getFirstAsync<{ location_count: number }>(
    "SELECT COUNT(*) AS location_count FROM locations WHERE name IN (?, ?)",
    ...SEED_LOCATIONS,
  );
  if ((seedCheck?.location_count ?? 0) !== SEED_LOCATIONS.length) {
    throw new Error("Default teaching locations could not be initialized.");
  }

  return database;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}
