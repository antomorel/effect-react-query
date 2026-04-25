import type { InfiniteData } from "@tanstack/react-query";
import { Context, Effect, Layer, ManagedRuntime, Schema } from "effect";
import { describe, expect, it } from "vitest";
import type {
  DefinedInitialDataInfiniteEffectQueryOptions,
  DefinedUseInfiniteEffectQueryResult,
  UseInfiniteEffectQueryOptions,
  UseInfiniteEffectQueryResult,
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

describe("useInfiniteEffectQuery types", () => {
  it("should export useInfiniteEffectQuery", async () => {
    const { useInfiniteEffectQuery } = await import("../src");
    expect(useInfiniteEffectQuery).toBeDefined();
    expect(typeof useInfiniteEffectQuery).toBe("function");
  });
});

describe("Type-level tests for runtime requirement (infinite query)", () => {
  it("should compile: effect without requirements, no runtime needed", () => {
    type Options = UseInfiniteEffectQueryOptions<
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

    type Options = UseInfiniteEffectQueryOptions<
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

describe("Infinite query result types", () => {
  it("should have correct result type structure", () => {
    type Result = UseInfiniteEffectQueryResult<InfiniteData<PostsPage>, NetworkError>;

    const checkResultType = (result: Result) => {
      // Infinite query results should have these properties
      const _hasNextPage: boolean | undefined = result.hasNextPage;
      const _hasPreviousPage: boolean | undefined = result.hasPreviousPage;
      const _fetchNextPage: () => void = () => result.fetchNextPage();
      const _fetchPreviousPage: () => void = () => result.fetchPreviousPage();
      const _isFetchingNextPage: boolean = result.isFetchingNextPage;
      const _isFetchingPreviousPage: boolean = result.isFetchingPreviousPage;

      return {
        _hasNextPage,
        _hasPreviousPage,
        _fetchNextPage,
        _fetchPreviousPage,
        _isFetchingNextPage,
        _isFetchingPreviousPage,
      };
    };

    expect(checkResultType).toBeDefined();
  });

  it("should have data always defined with defined initial data", () => {
    type Result = DefinedUseInfiniteEffectQueryResult<InfiniteData<PostsPage>, NetworkError>;

    const checkDataType = (result: Result) => {
      // With defined initial data, data should not be undefined
      const _data: InfiniteData<PostsPage> = result.data;
      return _data;
    };

    expect(checkDataType).toBeDefined();
  });
});

describe("Infinite query with defined initial data", () => {
  it("should compile: with defined initial data", () => {
    type Options = DefinedInitialDataInfiniteEffectQueryOptions<
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
      initialData: {
        pages: [{ items: [{ id: "initial", title: "Initial Post" }], nextCursor: 1 }],
        pageParams: [0],
      },
    };

    expect(_options.initialData).toBeDefined();
    expect(_options.initialData.pages).toHaveLength(1);
  });
});

describe("QueryFunctionContext access (infinite query)", () => {
  it("should provide pageParam in context", () => {
    type Options = UseInfiniteEffectQueryOptions<
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
