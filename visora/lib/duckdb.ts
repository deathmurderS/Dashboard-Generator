/**
 * DuckDB-WASM wrapper for in-browser data queries.
 *
 * This module lazily instantiates a single AsyncDuckDB instance inside the
 * browser and exposes query helpers used by the Datasets page to parse and
 * profile CSV/Excel uploads without sending data to a server.
 *
 * DuckDB and its worker bundles are loaded from jsDelivr at runtime so the
 * Next.js bundler stays simple and the WASM files never bloat the initial
 * page bundle.
 */

import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';

let dbPromise: Promise<AsyncDuckDB> | null = null;

async function createDB(): Promise<AsyncDuckDB> {
  const duckdb = await import('@duckdb/duckdb-wasm');
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );
  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);

  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);
  return db;
}

/** Get (or lazily create) the shared in-browser DuckDB instance. */
export async function getDB(): Promise<AsyncDuckDB> {
  if (typeof window === 'undefined') {
    throw new Error('DuckDB is browser-only');
  }
  if (!dbPromise) {
    dbPromise = createDB().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** Run SQL and return rows as plain JSON objects. */
export async function query<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const db = await getDB();
  const conn = await db.connect();
  try {
    const result = await conn.query(sql);
    const out: T[] = [];
    for (const row of result.toArray()) {
      const obj = row.toJSON ? row.toJSON() : { ...row };
      out.push(obj as T);
    }
    return out;
  } finally {
    await conn.close();
  }
}

/**
 * Load a CSV string into DuckDB as a table named after `tableName`,
 * returns the column names and row count.
 */
export async function loadCsvText(csvText: string, tableName = 'uploaded'): Promise<{
  columns: string[];
  rowCount: number;
}> {
  const db = await getDB();
  // Register the raw text as a virtual file FIRST — read_csv_auto can only
  // see files that exist in the instance's virtual filesystem.
  await db.registerFileText(`${tableName}.csv`, csvText);
  const conn = await db.connect();
  try {
    await conn.query(
      `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${tableName}.csv');`
    );
    const counts = await conn.query(
      `SELECT count(*) AS count FROM ${tableName};`
    );
    const cols = await conn.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY ordinal_position;`
    );
    return {
      columns: (cols.toArray() as Record<string, unknown>[]).map((c) =>
        String(c.column_name ?? '')
      ),
      rowCount: Number((counts.toArray() as Record<string, unknown>[])[0]?.count ?? 0),
    };
  } finally {
    await conn.close();
  }
}

/** Preview a table through DuckDB. */
export async function previewTable<T = Record<string, unknown>>(
  tableName: string,
  limit = 15
): Promise<T[]> {
  return query<T>(`SELECT * FROM ${tableName} LIMIT ${limit};`);
}

/** Quick column-type probe through DuckDB for the first N rows. */
export async function probeColumns(
  tableName: string,
  limit = 200
): Promise<{ name: string; type: string }[]> {
  return query<{ name: string; type: string }>(
    `DESCRIBE SELECT * FROM ${tableName} LIMIT ${limit};`
  );
}