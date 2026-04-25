import { useQuery } from "@tanstack/react-query";
import type { QueryKey, QueryFunctionContext } from "@tanstack/react-query";
import { Cause, Effect, Exit, ManagedRuntime, Runtime } from "effect";
import type {
  UseEffectQueryOptions,
  UseEffectQueryResult,
  DefinedInitialDataEffectQueryOptions,
  DefinedUseEffectQueryResult,
  UndefinedInitialDataEffectQueryOptions,
} from "./types";
import { hasProperty } from "effect/Predicate";

/**
 * A React Query hook that works with Effect.
 *
 * This hook wraps `useQuery` to provide typed error handling for Effects.
 * The error type from your Effect is preserved and can be matched using
 * Effect's pattern matching utilities.
 *
 * @example
 * ```ts
 * import { useEffectQuery } from "effect-react-query";
 * import { Match, Schema, Effect } from "effect";
 *
 * // Define your errors with Schema.TaggedError
 * class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
 *   message: Schema.String,
 * }) {}
 *
 * // Effect without requirements (R = never)
 * const query = useEffectQuery({
 *   queryKey: ["user", userId],
 *   queryFn: () => fetchUser(userId), // Effect<User, NetworkError, never>
 * });
 *
 * // Effect with requirements - runtime is required
 * const query = useEffectQuery({
 *   queryKey: ["user", userId],
 *   queryFn: () => fetchUserWithService(userId), // Effect<User, NetworkError, UserService>
 *   runtime: myRuntime, // Runtime<UserService>
 * });
 *
 * // Handle errors with Match
 * if (query.error) {
 *   Match.valueTags(query.error, {
 *     NetworkError: (e) => toast.error(e.message),
 *   });
 * }
 * ```
 */

// Overload 1: Defined initial data → data is always defined
export function useEffectQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: DefinedInitialDataEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): DefinedUseEffectQueryResult<TData, TError>;

// Overload 2: Undefined initial data → data may be undefined
export function useEffectQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: UndefinedInitialDataEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): UseEffectQueryResult<TData, TError>;

// Overload 3: General case
export function useEffectQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: UseEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): UseEffectQueryResult<TData, TError>;

// Implementation
export function useEffectQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
>(
  options: UseEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>,
): UseEffectQueryResult<TData, TError> {
  const { queryFn, runtime, ...restOptions } = options as {
    queryFn: (context: QueryFunctionContext<TQueryKey>) => Effect.Effect<TQueryFnData, TError, R>;
    runtime?: Runtime.Runtime<R> | ManagedRuntime.ManagedRuntime<R, unknown>;
  } & Omit<UseEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>, "queryFn" | "runtime">;

  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...restOptions,
    queryFn: async (context: QueryFunctionContext<TQueryKey>) => {
      const effect = queryFn(context);

      // Create an effect that listens to the AbortSignal for cancellation
      const withAbort = Effect.raceFirst(
        effect,
        Effect.async<never, never, never>((resume) => {
          if (context.signal.aborted) {
            resume(Effect.interrupt);
            return;
          }
          const onAbort = () => resume(Effect.interrupt);
          context.signal.addEventListener("abort", onAbort);
          return Effect.sync(() => context.signal.removeEventListener("abort", onAbort));
        }),
      );

      let exit: Exit.Exit<TQueryFnData, unknown>;

      if (runtime) {
        if (hasProperty(runtime, ManagedRuntime.TypeId)) {
          exit = await runtime.runPromiseExit(withAbort);
        } else {
          exit = await Runtime.runPromiseExit(runtime)(withAbort);
        }
      } else {
        exit = await Effect.runPromiseExit(
          withAbort as Effect.Effect<TQueryFnData, TError, never>,
        );
      }

      if (Exit.isSuccess(exit)) return exit.value;

      const cause = exit.cause;

      // Check for interruption - don't call onError, just hang
      // React Query will handle cleanup
      if (Cause.isInterruptedOnly(cause)) {
        return new Promise<TQueryFnData>(() => {
          // Never resolves - query is cancelled
        });
      }

      throw cause;
    },
  });
}
