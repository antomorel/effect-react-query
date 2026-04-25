import { Cause, Context, Effect, Layer, ManagedRuntime, Match, Schema } from "effect";
import { describe, expect, it } from "vitest";
import type {
  UseEffectQueryOptions,
  DefinedInitialDataEffectQueryOptions,
  UndefinedInitialDataEffectQueryOptions,
  UseEffectQueryResult,
  DefinedUseEffectQueryResult,
} from "../src";

// Define errors using Schema.TaggedError
class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  message: Schema.String,
}) {}

class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  resourceId: Schema.String,
}) {}

// Define a service for testing runtime requirements
class UserService extends Context.Tag("UserService")<
  UserService,
  { readonly getUser: (id: string) => Effect.Effect<{ id: string; name: string }, NetworkError> }
>() {}

// Type tests - these verify that the types work correctly at compile time
describe("useEffectQuery types", () => {
  it("should export useEffectQuery", async () => {
    const { useEffectQuery } = await import("../src");
    expect(useEffectQuery).toBeDefined();
    expect(typeof useEffectQuery).toBe("function");
  });
});

describe("Effect error handling logic for queries", () => {
  it("should extract failure from Effect exit", async () => {
    const error = new NetworkError({ message: "Connection failed" });
    const effect = Effect.fail(error);
    const exit = await Effect.runPromiseExit(effect);

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failureOption = Cause.failureOption(exit.cause);
      expect(failureOption._tag).toBe("Some");
      if (failureOption._tag === "Some") {
        expect(failureOption.value).toBeInstanceOf(NetworkError);
        expect(failureOption.value._tag).toBe("NetworkError");
        expect(failureOption.value.message).toBe("Connection failed");
      }
    }
  });

  it("should work with Match.valueTags for error discrimination in queries", () => {
    const errors: Array<NetworkError | NotFoundError> = [
      new NetworkError({ message: "Connection failed" }),
      new NotFoundError({ resourceId: "user-123" }),
    ];

    const results = errors.map((error) =>
      Match.valueTags(error, {
        NetworkError: (e) => `Network: ${e.message}`,
        NotFoundError: (e) => `NotFound: ${e.resourceId}`,
      }),
    );

    expect(results[0]).toBe("Network: Connection failed");
    expect(results[1]).toBe("NotFound: user-123");
  });

  it("should detect interruption for query cancellation", async () => {
    const effect = Effect.interrupt;
    const exit = await Effect.runPromiseExit(effect);

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      expect(Cause.isInterruptedOnly(exit.cause)).toBe(true);
    }
  });
});

describe("Runtime support for queries", () => {
  it("should run effects with runtime using Runtime.runPromiseExit", async () => {
    // Create a layer that provides the UserService
    const UserServiceLive = Layer.succeed(
      UserService,
      UserService.of({
        getUser: (id) => Effect.succeed({ id, name: "Test User" }),
      }),
    );

    // Create a managed runtime
    const runtime = ManagedRuntime.make(UserServiceLive);

    // Create an effect that requires UserService
    const effectWithService = Effect.gen(function* () {
      const userService = yield* UserService;
      return yield* userService.getUser("123");
    });

    // Run with runtime
    const exit = await runtime.runPromiseExit(effectWithService);

    expect(exit._tag).toBe("Success");
    if (exit._tag === "Success") {
      expect(exit.value).toEqual({ id: "123", name: "Test User" });
    }

    // Cleanup
    await runtime.dispose();
  });

  it("should handle failures in effects with runtime", async () => {
    const UserServiceLive = Layer.succeed(
      UserService,
      UserService.of({
        getUser: () => Effect.fail(new NetworkError({ message: "User not found" })),
      }),
    );

    const runtime = ManagedRuntime.make(UserServiceLive);

    const effectWithService = Effect.gen(function* () {
      const userService = yield* UserService;
      return yield* userService.getUser("123");
    });

    const exit = await runtime.runPromiseExit(effectWithService);

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failureOption = Cause.failureOption(exit.cause);
      expect(failureOption._tag).toBe("Some");
      if (failureOption._tag === "Some") {
        expect(failureOption.value._tag).toBe("NetworkError");
      }
    }

    await runtime.dispose();
  });
});

describe("AbortSignal handling", () => {
  it("should interrupt effect when abort signal is triggered", async () => {
    const controller = new AbortController();
    let wasInterrupted = false;

    const effect = Effect.gen(function* () {
      // Simulate a long-running operation
      yield* Effect.sleep("1 second");
      return "completed";
    }).pipe(
      Effect.onInterrupt(() =>
        Effect.sync(() => {
          wasInterrupted = true;
        }),
      ),
    );

    // Create an effect that listens to the AbortSignal (same logic as useEffectQuery)
    const withAbort = Effect.raceFirst(
      effect,
      Effect.async<never, never, never>((resume) => {
        if (controller.signal.aborted) {
          resume(Effect.interrupt);
          return;
        }
        const onAbort = () => resume(Effect.interrupt);
        controller.signal.addEventListener("abort", onAbort);
        return Effect.sync(() => controller.signal.removeEventListener("abort", onAbort));
      }),
    );

    // Start the effect and immediately abort
    const exitPromise = Effect.runPromiseExit(withAbort);
    controller.abort();

    const exit = await exitPromise;

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      expect(Cause.isInterruptedOnly(exit.cause)).toBe(true);
    }
    expect(wasInterrupted).toBe(true);
  });
});

describe("Type-level tests for runtime requirement", () => {
  it("should compile: effect without requirements, no runtime needed", () => {
    type EffectNoReqs = Effect.Effect<string, NetworkError, never>;
    type Options = UseEffectQueryOptions<string, NetworkError, string, ["test"], never>;

    // This should be valid - no runtime needed for Effect<..., never>
    const _options: Options = {
      queryKey: ["test"],
      queryFn: (): EffectNoReqs => Effect.succeed("test"),
    };

    expect(_options).toBeDefined();
  });

  it("should compile: effect with requirements, runtime required", () => {
    type EffectWithReqs = Effect.Effect<string, NetworkError, UserService>;
    type Options = UseEffectQueryOptions<
      string,
      NetworkError,
      string,
      ["user", string],
      UserService
    >;

    const UserServiceLive = Layer.succeed(
      UserService,
      UserService.of({
        getUser: () => Effect.succeed({ id: "1", name: "Test" }),
      }),
    );

    const runtime = ManagedRuntime.make(UserServiceLive);

    // This should be valid - runtime is provided for Effect<..., UserService>
    const _options: Options = {
      queryKey: ["user", "123"],
      queryFn: (): EffectWithReqs =>
        Effect.gen(function* () {
          const service = yield* UserService;
          const user = yield* service.getUser("1");
          return user.name;
        }),
      runtime: runtime,
    };

    expect(_options).toBeDefined();
  });
});

describe("Type-level tests for defined/undefined initial data", () => {
  it("should compile: defined initial data options", () => {
    type Options = DefinedInitialDataEffectQueryOptions<
      { id: string; name: string },
      NetworkError,
      { id: string; name: string },
      ["user", string],
      never
    >;

    const _options: Options = {
      queryKey: ["user", "123"],
      queryFn: () => Effect.succeed({ id: "123", name: "Test User" }),
      initialData: { id: "initial", name: "Initial User" },
    };

    expect(_options).toBeDefined();
    expect(_options.initialData).toBeDefined();
  });

  it("should compile: undefined initial data options", () => {
    type Options = UndefinedInitialDataEffectQueryOptions<
      { id: string; name: string },
      NetworkError,
      { id: string; name: string },
      ["user", string],
      never
    >;

    const _options: Options = {
      queryKey: ["user", "123"],
      queryFn: () => Effect.succeed({ id: "123", name: "Test User" }),
      // initialData is optional/undefined
    };

    expect(_options).toBeDefined();
  });

  it("should have correct result types for defined initial data", () => {
    // This is a compile-time test
    // DefinedUseEffectQueryResult should have data: TData (not TData | undefined)
    type Result = DefinedUseEffectQueryResult<{ id: string; name: string }, NetworkError>;

    // If this compiles, the types are correct
    const checkDataType = (_result: Result) => {
      // In a real scenario with defined initial data, data would be non-null
      // This just verifies the type structure
    };

    expect(checkDataType).toBeDefined();
  });

  it("should have correct result types for undefined initial data", () => {
    // This is a compile-time test
    // UseEffectQueryResult should have data: TData | undefined
    type Result = UseEffectQueryResult<{ id: string; name: string }, NetworkError>;

    const checkDataType = (_result: Result) => {
      // data could be undefined when query hasn't loaded yet
    };

    expect(checkDataType).toBeDefined();
  });
});

describe("QueryFunctionContext access", () => {
  it("should provide queryKey in context", () => {
    type Options = UseEffectQueryOptions<
      string,
      NetworkError,
      string,
      ["user", string, { includeDetails: boolean }],
      never
    >;

    const _options: Options = {
      queryKey: ["user", "123", { includeDetails: true }],
      queryFn: (context) => {
        // Verify context has queryKey with correct type
        const [_resource, userId, options] = context.queryKey;
        expect(userId).toBe("123");
        expect(options.includeDetails).toBe(true);
        return Effect.succeed(`User ${userId}`);
      },
    };

    expect(_options).toBeDefined();
  });
});
