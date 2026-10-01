import { useMutation } from "@tanstack/react-query";
import { createEffectQueryFn } from "./internal/createEffectQueryFn";
import type { UseEffectMutationOptions, UseEffectMutationResult } from "./types";

/**
 * A React Query mutation hook that works with Effect.
 *
 * @example
 * ```ts
 * import { useEffectMutation } from "@effect-react-query";
 * import * as Match from "effect/Match";
 * import * as Schema from "effect/Schema";
 *
 * // Define your errors with Schema.TaggedError
 * class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
 *   message: Schema.String,
 * }) {}
 *
 * // Effect without requirements (R = never)
 * const mutation = useEffectMutation({
 *   mutationFn: createUser, // Effect<User, NetworkError, never>
 *   onError: Match.valueTags({
 *     NetworkError: (e) => toast.error(e.message),
 *   }),
 * });
 *
 * // Effect with requirements - runtime is required
 * const mutation = useEffectMutation({
 *   mutationFn: createUserWithService, // Effect<User, NetworkError, UserService>
 *   runtime: myRuntime, // Context<UserService> or ManagedRuntime<UserService, E>
 *   onError: Match.valueTags({
 *     NetworkError: (e) => toast.error(e.message),
 *   }),
 * });
 * ```
 */
export function useEffectMutation<TData, TError, TVariables = void, TContext = unknown, R = never>(
  options: UseEffectMutationOptions<TData, TError, TVariables, TContext, R>,
): UseEffectMutationResult<TData, TError, TVariables, TContext> {
  const { mutationFn, runtime, ...restOptions } = options;

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    mutationFn: createEffectQueryFn(mutationFn, runtime, () => undefined),
  });

  return mutation;
}
