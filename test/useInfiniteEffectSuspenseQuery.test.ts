import type { InfiniteData } from "@tanstack/react-query";
import { Context, Effect, Layer, ManagedRuntime, Schema } from "effect";
import { describe, expect, it } from "vitest";
import type {
  UseInfiniteEffectSuspenseQueryOptions,
  UseInfiniteEffectSuspenseQueryResult,
} from "../src";

// Define errors using Schema.TaggedError
class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  message: Schema.String,
}) {}

// Define a page type for testing
interface PostsPage {
  items: Array<{ id: string; title: string }>;
  nextCursor: number | null;
}

// Define a service for testing runtime requirements
class PostService extends Context.Tag("PostService")<
  PostService,
  { readonly getPosts: (cursor: number) => Effect.Effect<PostsPage, NetworkError> }
>() {}

describe("useInfiniteEffectSuspenseQuery types", () => {
  it("should export useInfiniteEffectSuspenseQuery", async () => {
    const { useInfiniteEffectSuspenseQuery } = await import("../src");
    expect(useInfiniteEffectSuspenseQuery).toBeDefined();
    expect(typeof useInfiniteEffectSuspenseQuery).toBe("function");
  });
});

describe("Type-level tests for runtime requirement (infinite suspense query)", () => {
  it("should compile: effect without requirements, no runtime needed", () => {
    type Options = UseInfiniteEffectSuspenseQueryOptions<
      PostsPage,
      NetworkError,
      InfiniteData<PostsPage>,
      readonly ["posts"],
      number,
      never
    >;

    const _options: Options = {
      queryKey: ["posts"] as const,
      queryFn: ({ pageParam }) =>
        Effect.succeed({
          items: [{ id: "1", title: `Post at ${pageParam}` }],
          nextCursor: pageParam + 1,
        }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    };

    expect(_options).toBeDefined();
    expect(_options.initialPageParam).toBe(0);
  });

  it("should compile: effect with requirements, runtime required", () => {
    const PostServiceLive = Layer.succeed(
      PostService,
      PostService.of({
        getPosts: (cursor) =>
          Effect.succeed({
            items: [{ id: "1", title: `Post at ${cursor}` }],
            nextCursor: cursor + 1,
          }),
      }),
    );

    const runtime = ManagedRuntime.make(PostServiceLive);

    type Options = UseInfiniteEffectSuspenseQueryOptions<
      PostsPage,
      NetworkError,
      InfiniteData<PostsPage>,
      readonly ["posts"],
      number,
      PostService
    >;

    const _options: Options = {
      queryKey: ["posts"] as const,
      queryFn: ({ pageParam }) =>
        Effect.gen(function* () {
          const service = yield* PostService;
          return yield* service.getPosts(pageParam);
        }),
      runtime,
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    };

    expect(_options).toBeDefined();
    expect(_options.runtime).toBe(runtime);
  });
});

describe("Infinite suspense query result types", () => {
  it("should have data always defined in result type", () => {
    type Result = UseInfiniteEffectSuspenseQueryResult<InfiniteData<PostsPage>, NetworkError>;

    const checkDataType = (result: Result) => {
      // With suspense, data is always defined
      const _data: InfiniteData<PostsPage> = result.data;
      // Infinite query results should have these properties
      const _hasNextPage: boolean = result.hasNextPage;
      const _hasPreviousPage: boolean = result.hasPreviousPage;
      const _fetchNextPage: () => void = () => result.fetchNextPage();
      const _fetchPreviousPage: () => void = () => result.fetchPreviousPage();
      const _isFetchingNextPage: boolean = result.isFetchingNextPage;
      const _isFetchingPreviousPage: boolean = result.isFetchingPreviousPage;

      return {
        _data,
        _hasNextPage,
        _hasPreviousPage,
        _fetchNextPage,
        _fetchPreviousPage,
        _isFetchingNextPage,
        _isFetchingPreviousPage,
      };
    };

    expect(checkDataType).toBeDefined();
  });
});

describe("Suspense infinite query options should not have disabled options", () => {
  it("should not allow enabled option", () => {
    type Options = UseInfiniteEffectSuspenseQueryOptions<
      PostsPage,
      NetworkError,
      InfiniteData<PostsPage>,
      readonly ["posts"],
      number,
      never
    >;

    const _options: Options = {
      queryKey: ["posts"] as const,
      queryFn: ({ pageParam }) =>
        Effect.succeed({
          items: [{ id: "1", title: `Post at ${pageParam}` }],
          nextCursor: pageParam + 1,
        }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // enabled: true, // This should cause a type error if uncommented
    };

    // Verify that 'enabled' is not in the options type
    type HasEnabled = "enabled" extends keyof Options ? true : false;
    const _hasEnabled: HasEnabled = false;

    expect(_options).toBeDefined();
    expect(_hasEnabled).toBe(false);
  });

  it("should not allow throwOnError option", () => {
    type Options = UseInfiniteEffectSuspenseQueryOptions<
      PostsPage,
      NetworkError,
      InfiniteData<PostsPage>,
      readonly ["posts"],
      number,
      never
    >;

    // Verify that 'throwOnError' is not in the options type
    type HasThrowOnError = "throwOnError" extends keyof Options ? true : false;
    const _hasThrowOnError: HasThrowOnError = false;

    expect(_hasThrowOnError).toBe(false);
  });

  it("should not allow placeholderData option", () => {
    type Options = UseInfiniteEffectSuspenseQueryOptions<
      PostsPage,
      NetworkError,
      InfiniteData<PostsPage>,
      readonly ["posts"],
      number,
      never
    >;

    // Verify that 'placeholderData' is not in the options type
    type HasPlaceholderData = "placeholderData" extends keyof Options ? true : false;
    const _hasPlaceholderData: HasPlaceholderData = false;

    expect(_hasPlaceholderData).toBe(false);
  });
});

describe("QueryFunctionContext access (infinite suspense query)", () => {
  it("should provide pageParam and queryKey in context", () => {
    type Options = UseInfiniteEffectSuspenseQueryOptions<
      PostsPage,
      NetworkError,
      InfiniteData<PostsPage>,
      readonly ["posts", string],
      number,
      never
    >;

    const _options: Options = {
      queryKey: ["posts", "category-1"] as const,
      queryFn: (context) => {
        // Verify context has pageParam and queryKey
        const pageParam: number = context.pageParam;
        const [_resource, category] = context.queryKey;
        expect(category).toBe("category-1");
        return Effect.succeed({
          items: [{ id: "1", title: `Post at page ${pageParam}` }],
          nextCursor: pageParam + 1,
        });
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    };

    expect(_options).toBeDefined();
  });
});
