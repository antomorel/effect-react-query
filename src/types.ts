import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
  DefinedUseQueryResult,
  QueryKey,
  QueryFunctionContext,
  NonUndefinedGuard,
  InitialDataFunction,
} from "@tanstack/react-query";
import type { Effect, ManagedRuntime, Runtime } from "effect";

/**
 * Options for useEffectMutation hook.
 *
 * @typeParam TData - The success value type
 * @typeParam TError - The typed error type from Effect
 * @typeParam TVariables - The mutation input type
 * @typeParam TContext - The context type for optimistic updates
 * @typeParam R - The Effect requirements type
 */
export type UseEffectMutationOptions<
  TData,
  TError,
  TVariables,
  TContext = unknown,
  R = never,
> = Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn"> & {
  /**
   * The mutation function that returns an Effect.
   */
  mutationFn: (variables: TVariables) => Effect.Effect<TData, TError, R>;
} & RuntimeOption<R>;

/**
 * Runtime option - required when R is not never, forbidden when R is never.
 * Accepts either a Runtime or a ManagedRuntime.
 */
type RuntimeOption<R> = [R] extends [never]
  ? { runtime?: undefined }
  : { runtime: Runtime.Runtime<R> | ManagedRuntime.ManagedRuntime<R, unknown> };

/**
 * The result of useEffectMutation hook.
 */
export type UseEffectMutationResult<
  TData,
  TError,
  TVariables,
  TContext = unknown,
> = UseMutationResult<TData, TError, TVariables, TContext>;

/**
 * Options for useEffectQuery hook.
 *
 * @typeParam TQueryFnData - The data type returned by the query function
 * @typeParam TError - The typed error type from Effect
 * @typeParam TData - The data type after transformation (defaults to TQueryFnData)
 * @typeParam TQueryKey - The query key type
 * @typeParam R - The Effect requirements type
 */
export type UseEffectQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryFn"> & {
  /**
   * The query function that returns an Effect.
   * Receives the same QueryFunctionContext as standard useQuery.
   */
  queryFn: (context: QueryFunctionContext<TQueryKey>) => Effect.Effect<TQueryFnData, TError, R>;
} & RuntimeOption<R>;

/**
 * Options for useEffectQuery with defined initial data.
 * When initialData is provided, the result data is guaranteed to be defined.
 */
export type DefinedInitialDataEffectQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
> = Omit<UseEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>, "initialData"> & {
  initialData: NonUndefinedGuard<TQueryFnData> | (() => NonUndefinedGuard<TQueryFnData>);
};

/**
 * Options for useEffectQuery with undefined initial data.
 */
export type UndefinedInitialDataEffectQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
> = Omit<UseEffectQueryOptions<TQueryFnData, TError, TData, TQueryKey, R>, "initialData"> & {
  initialData?:
    | undefined
    | InitialDataFunction<NonUndefinedGuard<TQueryFnData>>
    | NonUndefinedGuard<TQueryFnData>;
};

/**
 * The result of useEffectQuery hook.
 */
export type UseEffectQueryResult<TData = unknown, TError = unknown> = UseQueryResult<TData, TError>;

/**
 * The result of useEffectQuery hook when initial data is defined.
 */
export type DefinedUseEffectQueryResult<TData = unknown, TError = unknown> = DefinedUseQueryResult<
  TData,
  TError
>;
