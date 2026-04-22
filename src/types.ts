import type { UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
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
