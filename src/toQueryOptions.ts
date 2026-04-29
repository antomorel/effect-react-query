import type { FetchQueryOptions, QueryKey } from "@tanstack/react-query";
import { createEffectQueryFn } from "./internal/createEffectQueryFn";
import type {
  DefinedInitialDataEffectQueryOptionsResult,
  UndefinedInitialDataEffectQueryOptionsResult,
  UseEffectQueryOptionsResult,
} from "./types";

/**
 * Converts Effect-based query options to standard React Query options
 * for use with queryClient methods like fetchQuery, ensureQueryData, prefetchQuery.
 *
 * @example
 * ```ts
 * import { effectQueryOptions, toQueryOptions } from "@antomorel/effect-react-query";
 * import { Effect } from "effect";
 *
 * // Define reusable query options
 * const userQueryOptions = (userId: string) => effectQueryOptions({
 *   queryKey: ["user", userId] as const,
 *   queryFn: () => fetchUser(userId), // Effect<User, NetworkError, never>
 * });
 *
 * // Use with queryClient methods
 * await queryClient.fetchQuery(toQueryOptions(userQueryOptions("123")));
 * await queryClient.ensureQueryData(toQueryOptions(userQueryOptions("456")));
 * await queryClient.prefetchQuery(toQueryOptions(userQueryOptions("789")));
 *
 * // With runtime requirements
 * const protectedQueryOptions = (userId: string) => effectQueryOptions({
 *   queryKey: ["user", userId] as const,
 *   queryFn: () => fetchUserWithService(userId), // Effect<User, NetworkError, AuthService>
 *   runtime: authRuntime,
 * });
 *
 * await queryClient.fetchQuery(toQueryOptions(protectedQueryOptions("123")));
 * ```
 */

export function toQueryOptions<TQueryFnData, TError, TData, TQueryKey extends QueryKey, R>(
  options: DefinedInitialDataEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>,
): FetchQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey>;

export function toQueryOptions<TQueryFnData, TError, TData, TQueryKey extends QueryKey, R>(
  options: UndefinedInitialDataEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>,
): FetchQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey>;

export function toQueryOptions<TQueryFnData, TError, TData, TQueryKey extends QueryKey, R>(
  options: UseEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>,
): FetchQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey>;

export function toQueryOptions<TQueryFnData, TError, TData, TQueryKey extends QueryKey, R>(
  options: UseEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>,
): FetchQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey> {
  const { queryFn, runtime, select: _select, ...restOptions } = options;

  return {
    ...restOptions,
    queryFn: createEffectQueryFn(queryFn, runtime, (context) => context.signal),
  };
}
