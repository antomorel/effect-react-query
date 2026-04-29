import type { QueryKey } from "@tanstack/react-query";
import type {
  DefinedInitialDataEffectQueryOptions,
  DefinedInitialDataEffectQueryOptionsResult,
  UndefinedInitialDataEffectQueryOptions,
  UndefinedInitialDataEffectQueryOptionsResult,
  UseEffectQueryOptions,
  UseEffectQueryOptionsResult,
} from "./types";

/**
 * Helper to create type-safe query options for useEffectQuery.
 *
 * This function provides type inference and a tagged queryKey for type-safe
 * query management. The options can be reused across components and passed
 * directly to useEffectQuery or useEffectSuspenseQuery.
 *
 * To use these options with `queryClient.prefetchQuery()`, `queryClient.fetchQuery()`,
 * or `queryClient.ensureQueryData()`, use the `toQueryOptions` helper to convert
 * the Effect-based options to standard React Query options.
 *
 * @example
 * ```ts
 * import { effectQueryOptions, toQueryOptions, useEffectQuery } from "@antomorel/effect-react-query";
 * import { Effect } from "effect";
 *
 * // Define reusable query options
 * const userQueryOptions = (userId: string) => effectQueryOptions({
 *   queryKey: ["user", userId] as const,
 *   queryFn: () => fetchUser(userId), // Effect<User, NetworkError, never>
 * });
 *
 * // Use in component with hooks
 * const query = useEffectQuery(userQueryOptions("123"));
 *
 * // Use with queryClient methods via toQueryOptions
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
 * ```
 */

export function effectQueryOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: DefinedInitialDataEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): DefinedInitialDataEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>;

export function effectQueryOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: UndefinedInitialDataEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): UndefinedInitialDataEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>;

export function effectQueryOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: UseEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): UseEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>;

// Implementation
export function effectQueryOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: UseEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): UseEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R> {
  return options as UseEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>;
}
