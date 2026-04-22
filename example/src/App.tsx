import { Effect, Match } from "effect";
import { useEffectMutation } from "../../src";
import { apiClient } from "./client";

export function App() {
  const { mutate: fetchSuccess } = useEffectMutation({
    mutationFn: () => apiClient.pipe(Effect.flatMap((client) => client.api.success())),
    onSuccess: () => console.log("Fetched successfully"),
  });

  const { mutate: fetchError } = useEffectMutation({
    mutationFn: () => apiClient.pipe(Effect.flatMap((client) => client.api.error())),
    onError: Match.valueTags({
      HttpApiDecodeError: (e) => console.error("Decode error:", e.message),
      ParseError: (e) => console.error("Parse error:", e.message),
      RequestError: (e) => console.error("Request error:", e.message),
      ResponseError: (e) => console.error("Response error:", e.message),
      BadRequest: (e) => console.error("HttpApiError"),
    }),
  });

  const { mutate: fetchDie } = useEffectMutation({
    mutationFn: () => apiClient.pipe(Effect.flatMap((client) => client.api.die())),
    onError: Match.valueTags({
      HttpApiDecodeError: (e) => console.error("Decode error:", e.message),
      ParseError: (e) => console.error("Parse error:", e.message),
      RequestError: (e) => console.error("Request error:", e.message),
      ResponseError: (e) => console.error("Response error:", e.message),
    }),
  });

  return (
    <div>
      <h1>effect-react-query example</h1>
      <button onClick={() => fetchSuccess({})}>Fetch success</button>
      <button onClick={() => fetchError({})}>Fetch error</button>
      <button onClick={() => fetchDie({})}>Fetch die</button>
    </div>
  );
}

export default App;
