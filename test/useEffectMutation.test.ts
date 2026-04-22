import { Cause, Context, Effect, Layer, ManagedRuntime, Match, Schema } from "effect";
import { describe, expect, it } from "vitest";
import type { UseEffectMutationOptions } from "../src";

// Define errors using Schema.TaggedError
class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  message: Schema.String,
}) {}

class ValidationError extends Schema.TaggedError<ValidationError>()("ValidationError", {
  fields: Schema.Record({ key: Schema.String, value: Schema.String }),
}) {}

// Define a service for testing runtime requirements
class UserService extends Context.Tag("UserService")<
  UserService,
  { readonly getUser: (id: string) => Effect.Effect<{ id: string; name: string }, NetworkError> }
>() {}

// Type tests - these verify that the types work correctly at compile time
describe("useEffectMutation types", () => {
  it("should export useEffectMutation", async () => {
    const { useEffectMutation } = await import("../src");
    expect(useEffectMutation).toBeDefined();
    expect(typeof useEffectMutation).toBe("function");
  });
});

describe("Effect error handling logic", () => {
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

  it("should extract defect from Effect exit", async () => {
    const defect = new Error("Unexpected crash");
    const effect = Effect.die(defect);
    const exit = await Effect.runPromiseExit(effect);

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const dieOption = Cause.dieOption(exit.cause);
      expect(dieOption._tag).toBe("Some");
      if (dieOption._tag === "Some") {
        expect(dieOption.value).toBe(defect);
      }
    }
  });

  it("should detect interruption", async () => {
    const effect = Effect.interrupt;
    const exit = await Effect.runPromiseExit(effect);

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      expect(Cause.isInterruptedOnly(exit.cause)).toBe(true);
    }
  });

  it("should work with Match.valueTags for error discrimination", () => {
    const errors: Array<NetworkError | ValidationError> = [
      new NetworkError({ message: "Connection failed" }),
      new ValidationError({ fields: { email: "Invalid email" } }),
    ];

    const results = errors.map((error) =>
      Match.valueTags(error, {
        NetworkError: (e) => `Network: ${e.message}`,
        ValidationError: (e) => `Validation: ${Object.keys(e.fields).join(", ")}`,
      }),
    );

    expect(results[0]).toBe("Network: Connection failed");
    expect(results[1]).toBe("Validation: email");
  });

  it("should work with Match.type for creating error handlers", () => {
    const handler = Match.type<NetworkError | ValidationError>().pipe(
      Match.tag("NetworkError", (e) => `Network: ${e.message}`),
      Match.tag("ValidationError", (e) => `Validation: ${Object.keys(e.fields).join(", ")}`),
      Match.exhaustive,
    );

    expect(handler(new NetworkError({ message: "Failed" }))).toBe("Network: Failed");
    expect(handler(new ValidationError({ fields: { name: "Required" } }))).toBe("Validation: name");
  });

  it("should handle UnknownException in Match", () => {
    type ErrorType = NetworkError | ValidationError | Cause.UnknownException;

    const handler = Match.type<ErrorType>().pipe(
      Match.tag("NetworkError", (e) => `Network: ${e.message}`),
      Match.tag("ValidationError", (e) => `Validation: ${Object.keys(e.fields).join(", ")}`),
      Match.tag("UnknownException", (e) => `Unknown: ${String(e.error)}`),
      Match.exhaustive,
    );

    expect(handler(new NetworkError({ message: "Failed" }))).toBe("Network: Failed");
    expect(handler(new Cause.UnknownException("crash"))).toBe("Unknown: crash");
  });
});

describe("Runtime support", () => {
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

describe("Type-level tests for runtime requirement", () => {
  it("should compile: effect without requirements, no runtime needed", () => {
    // This test verifies the types at compile time
    // If this compiles, the types are correct
    type EffectNoReqs = Effect.Effect<string, NetworkError, never>;
    type Options = UseEffectMutationOptions<string, NetworkError, void, unknown, never>;

    // This should be valid - no runtime needed for Effect<..., never>
    const _options: Options = {
      mutationFn: (): EffectNoReqs => Effect.succeed("test"),
    };

    expect(_options).toBeDefined();
  });

  it("should compile: effect with requirements, runtime required", () => {
    type EffectWithReqs = Effect.Effect<string, NetworkError, UserService>;
    type Options = UseEffectMutationOptions<string, NetworkError, void, unknown, UserService>;

    const UserServiceLive = Layer.succeed(
      UserService,
      UserService.of({
        getUser: () => Effect.succeed({ id: "1", name: "Test" }),
      }),
    );

    const runtime = ManagedRuntime.make(UserServiceLive);

    // This should be valid - runtime is provided for Effect<..., UserService>
    const _options: Options = {
      mutationFn: (): EffectWithReqs =>
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
