import { getCloudflareContext } from '@opennextjs/cloudflare';

const unavailableBindingMessage = 'D1 binding "DB" is unavailable';

export function getD1Database(explicit?: D1Database): D1Database {
  if (explicit !== undefined) {
    return explicit;
  }

  try {
    const database = (getCloudflareContext().env as { DB?: D1Database | null }).DB;
    if (database !== undefined && database !== null) {
      return database;
    }
  } catch {
    // Normalize unavailable OpenNext context to the D1 binding contract.
  }

  throw new Error(unavailableBindingMessage);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toSqlBool(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

export function fromSqlBool(value: number | boolean | null): boolean {
  return value !== 0 && value !== false && value !== null;
}

export function parseJsonRecord(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (isPlainRecord(parsed)) {
      return parsed;
    }
  } catch {
    // Invalid JSON uses the same empty record fallback as non-object JSON.
  }

  return {};
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}
