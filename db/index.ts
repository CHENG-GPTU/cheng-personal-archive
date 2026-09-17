import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let sqlClient: ReturnType<typeof neon> | null = null;
let schemaPromise: Promise<void> | null = null;

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  return value;
}

function getSqlClient() {
  if (!sqlClient) sqlClient = neon(databaseUrl());
  return sqlClient;
}

function createDatabase() {
  return drizzle(getSqlClient(), { schema });
}

type Database = ReturnType<typeof createDatabase>;
let database: Database | null = null;

export function getDb(): Database {
  if (!database) database = createDatabase();
  return database;
}

/**
 * The personal workspace is intentionally small, so the first authenticated
 * request can safely create its four tables. This keeps a new Vercel project
 * usable immediately after a managed Postgres database is connected.
 */
export function ensureAipmSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = getSqlClient();
      await sql`
        CREATE TABLE IF NOT EXISTS aipm_profiles (
          owner_id text PRIMARY KEY,
          current_level integer NOT NULL DEFAULT 1,
          created_at text NOT NULL,
          updated_at text NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS aipm_level_records (
          owner_id text NOT NULL,
          level_id integer NOT NULL,
          status text NOT NULL DEFAULT 'open',
          draft text NOT NULL DEFAULT '',
          score_json text,
          feedback text,
          evidence text,
          passed_at text,
          updated_at text NOT NULL,
          PRIMARY KEY (owner_id, level_id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS aipm_messages (
          id text PRIMARY KEY,
          owner_id text NOT NULL,
          level_id integer NOT NULL,
          role text NOT NULL,
          content text NOT NULL,
          created_at text NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS aipm_evidence (
          id text PRIMARY KEY,
          owner_id text NOT NULL,
          level_id integer NOT NULL,
          project text NOT NULL,
          title text NOT NULL,
          content text NOT NULL,
          public_selected boolean NOT NULL DEFAULT false,
          created_at text NOT NULL,
          updated_at text NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS aipm_messages_owner_level_idx ON aipm_messages (owner_id, level_id, created_at)`;
      await sql`CREATE INDEX IF NOT EXISTS aipm_evidence_owner_level_idx ON aipm_evidence (owner_id, level_id)`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}
