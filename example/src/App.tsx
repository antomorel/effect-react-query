import { useEffectMutation } from "@antomorel/effect-react-query";
import { Effect, Match } from "effect";
import { apiClient } from "./client";

export function App() {
  const { mutate } = useEffectMutation({
    mutationFn: (payload: "success" | "error" | "die") =>
      apiClient.pipe(Effect.flatMap((client) => client.api.testMutation({ payload }))),
    onSuccess: () => console.log("Fetched successfully"),
    onError: Match.valueTags({
      HttpApiDecodeError: (e) => console.error("Decode error:", e.message),
      ParseError: (e) => console.error("Parse error:", e.message),
      RequestError: (e) => console.error("Request error:", e.message),
      ResponseError: (e) => console.error("Response error:", e.message),
      BadRequest: () => console.error("BadRequest"),
    }),
  });

  return (
    <div>
      <h1>effect-react-query example</h1>
      <button onClick={() => mutate("success")}>Fetch success</button>
      <button onClick={() => mutate("error")}>Fetch error</button>
      <button onClick={() => mutate("die")}>Fetch die</button>
    </div>
  );
}

export default App;
