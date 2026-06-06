type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

/**
 * Extracts a human-readable message from any thrown value.
 *
 * Supabase's PostgrestError is frequently a plain object (`{ message, details,
 * hint, code }`) rather than a real `Error` instance, so `err instanceof Error`
 * misses it and callers fall back to a useless generic string. This handles
 * both shapes and maps a few common Postgres error codes to actionable copy.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === 'object') {
    const e = err as SupabaseLikeError;

    // 42P01 = undefined_table — the migration for this table has not been run yet.
    if (e.code === '42P01') {
      return 'This table is not set up in the database yet. Run the latest migration from supabase/schema.sql in the Supabase SQL editor.';
    }
    // 42501 = insufficient_privilege — RLS is on or grants were not applied.
    if (e.code === '42501') {
      return 'Database permission denied. Ensure RLS is disabled and anon grants are applied (see the bottom of supabase/schema.sql).';
    }
    if (e.message) return e.message;
    if (e.details) return e.details;
  }

  return fallback;
}
