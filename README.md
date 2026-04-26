# effect-react-query

Integration between [Effect](https://effect.website/) and [TanStack React Query](https://tanstack.com/query).

## Installation

```bash
npm install @antomorel/effect-react-query
# or
bun add @antomorel/effect-react-query
# or
pnpm add @antomorel/effect-react-query
```

## Quick Example

```ts
import { useEffectQuery, useEffectMutation } from "@antomorel/effect-react-query";
import { Effect, Schema, Match } from "effect";

// Define typed errors
class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  message: Schema.String,
}) {}

// Use with queries
const query = useEffectQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId), // Effect<User, NetworkError>
});

// Use with mutations
const mutation = useEffectMutation({
  mutationFn: (data: CreateUserInput) => createUser(data),
  onError: Match.valueTags({
    NetworkError: (e) => toast.error(e.message),
  }),
});

// Type-safe error handling
if (query.error) {
  Match.valueTags(query.error, {
    NetworkError: (e) => console.log(e.message),
  });
}
```

## Documentation

See the [full API reference](./docs/index.md)
