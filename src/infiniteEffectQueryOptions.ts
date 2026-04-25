import type { QueryKey } from "@tanstack/react-query";
import type {
  DefinedInitialDataInfiniteEffectQueryOptions,
  DefinedInitialDataInfiniteEffectQueryOptionsResult,
  UndefinedInitialDataInfiniteEffectQueryOptions,
  UndefinedInitialDataInfiniteEffectQueryOptionsResult,
  UseInfiniteEffectQueryOptions,
  UseInfiniteEffectQueryOptionsResult,
} from "./types";

/**
 * Helper to create type-safe query options for useInfiniteEffectQuery.
 *
 * This function provides type inference and a tagged queryKey for type-safe
 * query management. The options can be reused across components and passed
 * directly to useInfiniteEffectQuery.
 *
 * Note: These options cannot be used directly with `queryClient.prefetchInfiniteQuery()`
 * or `queryClient.fetchInfiniteQuery()` because the queryFn returns an Effect, not a Promise.
 * For prefetching, you need to manually convert the Effect to a Promise.
 *
 * @example
 * ```ts
 * import { infiniteEffectQueryOptions, useInfiniteEffectQuery } from "effect-react-query";
 * import { Effect } from "effect";
 *
 * // Define reusable infinite query options
 * const postsQueryOptions = () => infiniteEffectQueryOptions({
 *   queryKey: ["posts"] as const,
 *   queryFn: ({ pageParam }) => fetchPosts(pageParam), // Effect<PostsPage, NetworkError, never>
 *   initialPageParam: 0,
 *   getNextPageParam: (lastPage) => lastPage.nextCursor,
 * });
 *
 * // Use in component
 * const query = useInfiniteEffectQuery(postsQueryOptions());
 *
 * // With runtime requirements
 * const protectedPostsOptions = () => infiniteEffectQueryOptions({
 *   queryKey: ["protected-posts"] as const,
 *   queryFn: ({ pageParam }) => fetchProtectedPosts(pageParam),
 *   runtime: authRuntime,
 *   initialPageParam: 0,
 *   getNextPageParam: (lastPage) => lastPage.nextCursor,
 * });
 * ```
 */

// Overload 1: Defined initial data
export function infiniteEffectQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
  R = never,
>(
  options: DefinedInitialDataInfiniteEffectQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam,
    R
  >,
): DefinedInitialDataInfiniteEffectQueryOptionsResult<
  TQueryFnData,
  TError,
  TData,
  TQueryKey,
  TPageParam,
  R
>;

// Overload 2: Undefined initial data
export function infiniteEffectQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
  R = never,
>(
  options: UndefinedInitialDataInfiniteEffectQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam,
    R
  >,
): UndefinedInitialDataInfiniteEffectQueryOptionsResult<
  TQueryFnData,
  TError,
  TData,
  TQueryKey,
  TPageParam,
  R
>;

// Overload 3: General case
export function infiniteEffectQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
  R = never,
>(
  options: UseInfiniteEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam, R>,
): UseInfiniteEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, TPageParam, R>;

// Implementation
export function infiniteEffectQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
  R = never,
>(
  options: UseInfiniteEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam, R>,
): UseInfiniteEffectQueryOptionsResult<TQueryFnData, TError, TData, TQueryKey, TPageParam, R> {
  return options as UseInfiniteEffectQueryOptionsResult<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam,
    R
  >;
}
