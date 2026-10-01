import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as ManagedRuntime from "effect/ManagedRuntime";

/**
 * Creates a query function that wraps an Effect-returning function.
 * Handles runtime execution, AbortSignal cancellation, and error handling.
 *
 * @internal
 */
export function createEffectQueryFn<TQueryFnData, TError, TContext, R>(
  effectFn: (context: TContext) => Effect.Effect<TQueryFnData, TError, R>,
  runtime: Context.Context<R> | ManagedRuntime.ManagedRuntime<R, unknown> | undefined,
  getSignal: (context: TContext) => AbortSignal | undefined,
): (context: TContext) => Promise<TQueryFnData> {
  return async (context: TContext) => {
    const effect = effectFn(context);
    const options = { signal: getSignal(context) };

    // Use unknown for error type since ManagedRuntime can add layer errors
    const exit: Exit.Exit<TQueryFnData, unknown> = Context.isContext(runtime)
      ? await Effect.runPromiseExitWith(runtime)(effect, options)
      : runtime !== undefined
        ? await runtime.runPromiseExit(effect, options)
        : await Effect.runPromiseExit(
            effect as Effect.Effect<TQueryFnData, TError, never>,
            options,
          );

    if (Exit.isSuccess(exit)) return exit.value;

    const cause = exit.cause;

    // Check for interruption - don't call onError, just hang
    // React Query will handle cleanup
    if (Cause.hasInterruptsOnly(cause)) {
      return new Promise<TQueryFnData>(() => {
        // Never resolves - query is cancelled
      });
    }

    throw Cause.squash(cause);
  };
}
