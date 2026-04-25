import { Cause, Effect, Exit, ManagedRuntime, Runtime } from "effect";
import { hasProperty } from "effect/Predicate";

/**
 * Creates a query function that wraps an Effect-returning function.
 * Handles runtime execution, AbortSignal cancellation, and error handling.
 *
 * @internal
 */
export function createEffectQueryFn<TQueryFnData, TError, TContext, R>(
  effectFn: (context: TContext) => Effect.Effect<TQueryFnData, TError, R>,
  runtime: Runtime.Runtime<R> | ManagedRuntime.ManagedRuntime<R, unknown> | undefined,
  getSignal: (context: TContext) => AbortSignal,
): (context: TContext) => Promise<TQueryFnData> {
  return async (context: TContext) => {
    const effect = effectFn(context);
    const signal = getSignal(context);

    // Create an effect that listens to the AbortSignal for cancellation
    const withAbort = Effect.raceFirst(
      effect,
      Effect.async<never, never, never>((resume) => {
        if (signal.aborted) {
          resume(Effect.interrupt);
          return;
        }
        const onAbort = () => resume(Effect.interrupt);
        signal.addEventListener("abort", onAbort);
        return Effect.sync(() => signal.removeEventListener("abort", onAbort));
      }),
    );

    // Determine how to run the effect based on runtime type
    // Use unknown for error type since ManagedRuntime can add layer errors
    let exit: Exit.Exit<TQueryFnData, unknown>;

    if (runtime) {
      if (hasProperty(runtime, ManagedRuntime.TypeId)) {
        exit = await runtime.runPromiseExit(withAbort);
      } else {
        exit = await Runtime.runPromiseExit(runtime)(withAbort);
      }
    } else {
      exit = await Effect.runPromiseExit(withAbort as Effect.Effect<TQueryFnData, TError, never>);
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

    throw Cause.squash(cause);
  };
}
