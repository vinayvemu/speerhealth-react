import type { GraphQLError } from 'graphql';

// ─── Result type — no silent failures ──────────────────────────────────────

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ─── Typed application errors ───────────────────────────────────────────────

export type AppError =
  | { type: 'network'; message: string }
  | { type: 'graphql'; errors: readonly GraphQLError[] }
  | { type: 'conflict'; mine: Record<string, unknown>; theirs: Record<string, unknown>; updatedAt: string }
  | { type: 'stale_write'; currentUpdatedAt: string }
  | { type: 'auth'; reason: 'expired' | 'forbidden' | 'invalid_credentials' }
  | { type: 'unknown'; message: string };

export function toAppError(e: unknown): AppError {
  if (e instanceof Error) {
    // ApolloError duck-typing
    const ae = e as { graphQLErrors?: readonly GraphQLError[]; networkError?: Error };
    if (ae.graphQLErrors?.length) return { type: 'graphql', errors: ae.graphQLErrors };
    if (ae.networkError) return { type: 'network', message: ae.networkError.message };
    return { type: 'unknown', message: e.message };
  }
  return { type: 'unknown', message: String(e) };
}
