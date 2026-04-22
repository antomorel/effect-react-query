import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { Api } from "./api.js";
import { Effect } from "effect";

export const apiClient = HttpApiClient.make(Api, {
  baseUrl: "http://localhost:3000",
}).pipe(Effect.provide(FetchHttpClient.layer));
