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
 * Note: These options cannot be used directly with `queryClient.prefetchQuery()`
 * or `queryClient.fetchQuery()` because the queryFn returns an Effect, not a Promise.
 * For prefetching, you need to manually convert the Effect to a Promise.
 *
 * @example
 * ```ts
 * import { effectQueryOptions, useEffectQuery } from "effect-react-query";
 * import { Effect } from "effect";
 *
 * // Define reusable query options
 * const userQueryOptions = (userId: string) => effectQueryOptions({
 *   queryKey: ["user", userId] as const,
 *   queryFn: () => fetchUser(userId), // Effect<User, NetworkError, never>
 * });
 *
 * // Use in component
 * const query = useEffectQuery(userQueryOptions("123"));
 *
 * // With runtime requirements
 * const protectedQueryOptions = (userId: string) => effectQueryOptions({
 *   queryKey: ["user", userId] as const,
 *   queryFn: () => fetchUserWithService(userId), // Effect<User, NetworkError, AuthService>
 *   runtime: authRuntime,
 * });
 * ```
 */

// Overload 1: Defined initial data
export function effectQueryOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: DefinedInitialDataEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): DefinedInitialDataEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>;

// Overload 2: Undefined initial data
export function effectQueryOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: UndefinedInitialDataEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): UndefinedInitialDataEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, R>;

// Overload 3: General case
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
