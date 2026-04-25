import { Context, Effect, Layer, ManagedRuntime, Schema } from "effect";
import { describe, expect, it } from "vitest";
import type { UseEffectSuspenseQueryOptions, UseEffectSuspenseQueryResult } from "../src";

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
describe("useEffectSuspenseQuery types", () => {
  it("should export useEffectSuspenseQuery", async () => {
    const { useEffectSuspenseQuery } = await import("../src");
    expect(useEffectSuspenseQuery).toBeDefined();
    expect(typeof useEffectSuspenseQuery).toBe("function");
  });
});

describe("Type-level tests for runtime requirement (suspense)", () => {
  it("should compile: effect without requirements, no runtime needed", () => {
    type EffectNoReqs = Effect.Effect<string, NetworkError, never>;
    type Options = UseEffectSuspenseQueryOptions<string, NetworkError, string, ["test"], never>;

    // This should be valid - no runtime needed for Effect<..., never>
    const _options: Options = {
      queryKey: ["test"],
      queryFn: (): EffectNoReqs => Effect.succeed("test"),
    };

    expect(_options).toBeDefined();
  });

  it("should compile: effect with requirements, runtime required", () => {
    type EffectWithReqs = Effect.Effect<string, NetworkError, UserService>;
    type Options = UseEffectSuspenseQueryOptions<
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

describe("Suspense query result types", () => {
  it("should have data always defined in result type", () => {
    // This is a compile-time test
    // UseSuspenseQueryResult should have data: TData (not TData | undefined)
    type Result = UseEffectSuspenseQueryResult<{ id: string; name: string }, NetworkError>;

    // If this compiles, the types are correct
    const checkDataType = (result: Result) => {
      // In suspense queries, data is always defined
      // This verifies that result.data is not typed as possibly undefined
      const _data: { id: string; name: string } = result.data;
      return _data;
    };

    expect(checkDataType).toBeDefined();
  });
});

describe("Suspense query options should not have disabled options", () => {
  it("should not allow enabled option", () => {
    // This is a compile-time test
    // UseSuspenseQueryOptions should not have 'enabled' property
    type Options = UseEffectSuspenseQueryOptions<string, NetworkError, string, ["test"], never>;

    const _options: Options = {
      queryKey: ["test"],
      queryFn: () => Effect.succeed("test"),
      // enabled: true, // This should cause a type error if uncommented
    };

    // Verify that 'enabled' is not in the options type
    type HasEnabled = "enabled" extends keyof Options ? true : false;
    const _hasEnabled: HasEnabled = false;

    expect(_options).toBeDefined();
    expect(_hasEnabled).toBe(false);
  });

  it("should not allow throwOnError option", () => {
    type Options = UseEffectSuspenseQueryOptions<string, NetworkError, string, ["test"], never>;

    // Verify that 'throwOnError' is not in the options type
    type HasThrowOnError = "throwOnError" extends keyof Options ? true : false;
    const _hasThrowOnError: HasThrowOnError = false;

    expect(_hasThrowOnError).toBe(false);
  });

  it("should not allow placeholderData option", () => {
    type Options = UseEffectSuspenseQueryOptions<string, NetworkError, string, ["test"], never>;

    // Verify that 'placeholderData' is not in the options type
    type HasPlaceholderData = "placeholderData" extends keyof Options ? true : false;
    const _hasPlaceholderData: HasPlaceholderData = false;

    expect(_hasPlaceholderData).toBe(false);
  });
});

describe("QueryFunctionContext access (suspense)", () => {
  it("should provide queryKey in context", () => {
    type Options = UseEffectSuspenseQueryOptions<
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
