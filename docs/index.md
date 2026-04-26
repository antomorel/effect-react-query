# API Reference

## useEffectQuery

React Query's `useQuery` that accepts Effect-returning query functions.

```ts
import { useEffectQuery } from "@antomorel/effect-react-query";

const query = useEffectQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId), // Effect<User, NetworkError>
});
```

### Options

| Option    | Description                                                                   |
| --------- | ----------------------------------------------------------------------------- |
| `queryFn` | `(context: QueryFunctionContext) => Effect.Effect<TData, TError, R>`          |
| `runtime` | Required when Effect has service requirements (`Runtime` or `ManagedRuntime`) |
| `...`     | All standard React Query options (`staleTime`, `gcTime`, `retry`, etc.)       |

### With Runtime Dependencies

When your Effect requires services, provide a `runtime`:

```ts
const query = useEffectQuery({
  queryKey: ["user", userId],
  queryFn: () =>
    Effect.gen(function* () {
      const service = yield* UserService;
      return yield* service.getUser(userId);
    }),
  runtime: myRuntime, // Required when Effect has service requirements
});
```

## useEffectSuspenseQuery

Suspense version of `useEffectQuery`. Data is always defined (component suspends until loaded).

```ts
import { useEffectSuspenseQuery } from "@antomorel/effect-react-query";

// Wrap in React Suspense boundary
const query = useEffectSuspenseQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
});

// query.data is guaranteed to be defined
console.log(query.data.name);
```

Does not support `enabled`, `throwOnError`, or `placeholderData` options.

## useEffectMutation

React Query's `useMutation` for Effect-returning mutation functions.

```ts
import { useEffectMutation } from "@antomorel/effect-react-query";

const mutation = useEffectMutation({
  mutationFn: (data: CreateUserInput) => createUser(data),
  onSuccess: (user) => console.log("Created:", user.name),
  onError: (error) => console.error(error),
});

// Trigger mutation
mutation.mutate({ name: "John", email: "john@example.com" });
```

### Options

| Option       | Description                                                                   |
| ------------ | ----------------------------------------------------------------------------- |
| `mutationFn` | `(variables: TVariables) => Effect.Effect<TData, TError, R>`                  |
| `runtime`    | Required when Effect has service requirements (`Runtime` or `ManagedRuntime`) |
| `onError`    | Callback on error (receives typed error)                                      |
| `...`        | All standard React Query mutation options                                     |

## useInfiniteEffectQuery

React Query's `useInfiniteQuery` for paginated Effect queries.

```ts
import { useInfiniteEffectQuery } from "@antomorel/effect-react-query";

interface PostsPage {
  items: Post[];
  nextCursor: number | null;
}

const query = useInfiniteEffectQuery({
  queryKey: ["posts"],
  queryFn: ({ pageParam }) => fetchPosts(pageParam), // Effect<PostsPage, Error>
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

// Access paginated data
const allPosts = query.data?.pages.flatMap((page) => page.items);

// Load more
if (query.hasNextPage) {
  query.fetchNextPage();
}
```

## useInfiniteEffectSuspenseQuery

Suspense version of `useInfiniteEffectQuery`. Data is always defined.

## effectQueryOptions

Creates reusable, type-safe query options for `useEffectQuery` or `useEffectSuspenseQuery`.

```ts
import { effectQueryOptions, useEffectQuery } from "@antomorel/effect-react-query";

// Define reusable query options
const userQueryOptions = (userId: string) =>
  effectQueryOptions({
    queryKey: ["user", userId] as const,
    queryFn: () => fetchUser(userId),
    staleTime: 5000,
  });

// Use in multiple components
const query = useEffectQuery(userQueryOptions("123"));
```

## infiniteEffectQueryOptions

Creates reusable, type-safe options for `useInfiniteEffectQuery`.

```ts
import { infiniteEffectQueryOptions } from "@antomorel/effect-react-query";

const postsQueryOptions = () =>
  infiniteEffectQueryOptions({
    queryKey: ["posts"] as const,
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
```

# Type-Safe Error Handling

Errors retain their typed structure and can be matched using Effect's `Match.valueTags`:

```ts
import { Schema, Match } from "effect";
import { useEffectQuery } from "@antomorel/effect-react-query";

// Define typed errors
class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  message: Schema.String,
}) {}

class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  resourceId: Schema.String,
}) {}

// Errors are fully typed
const query = useEffectQuery({
  queryKey: ["user", id],
  queryFn: () => fetchUser(id), // Effect<User, NetworkError | NotFoundError>
});

// Match on error types
if (query.error) {
  const message = Match.valueTags(query.error, {
    NetworkError: (e) => `Network issue: ${e.message}`,
    NotFoundError: (e) => `User ${e.resourceId} not found`,
  });
}
```

### With Mutations

```ts
const mutation = useEffectMutation({
  mutationFn: (data: CreateUserInput) => createUser(data),
  onError: Match.valueTags({
    NetworkError: (e) => toast.error(e.message),
    ValidationError: (e) => toast.error(`Invalid fields`),
  }),
});
```

# Dependency Injection

When Effects have service requirements, provide a `ManagedRuntime` or `Runtime`:

```ts
import { Context, Effect, Layer, ManagedRuntime } from "effect";
import { useEffectQuery } from "@antomorel/effect-react-query";

// Define a service
class UserService extends Context.Tag("UserService")<
  UserService,
  { readonly getUser: (id: string) => Effect.Effect<User, NetworkError> }
>() {}

// Create the layer
const UserServiceLive = Layer.succeed(
  UserService,
  UserService.of({
    getUser: (id) =>
      Effect.succeed({
        id,
        name: "User",
        createdAt: new Date(),
      }),
  }),
);

// Create runtime
const runtime = ManagedRuntime.make(UserServiceLive);

// Use in hook - TypeScript enforces runtime when Effect has requirements
const query = useEffectQuery({
  queryKey: ["user", userId],
  queryFn: () =>
    Effect.gen(function* () {
      const service = yield* UserService;
      return yield* service.getUser(userId);
    }),
  runtime,
});
```

# Advanced Patterns

## Automatic Cancellation

When React Query cancels a query (component unmount, new query, etc.), the Effect is properly interrupted:

```ts
const query = useEffectQuery({
  queryKey: ["user", userId],
  queryFn: () =>
    Effect.gen(function* () {
      yield* Effect.sleep("10 seconds");
      return { id: userId, name: "User" };
    }).pipe(Effect.onInterrupt(() => Effect.sync(() => console.log("Query was cancelled")))),
});
```

## Initial Data

With defined initial data, TypeScript knows data is never undefined:

```ts
const query = useEffectQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
  initialData: { id: "0", name: "Loading..." },
});

// query.data is { id: string; name: string } (not undefined)
console.log(query.data.name);
```

## Defect Handling

Effect defects (unexpected errors from `Effect.die`) are thrown as-is:

```ts
const query = useEffectQuery({
  queryKey: ["data"],
  queryFn: () => Effect.die(new Error("Unexpected crash")),
});
```
