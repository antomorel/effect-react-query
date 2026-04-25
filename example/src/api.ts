import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export const HelloResponse = Schema.Struct({
  message: Schema.String,
  method: Schema.String,
});

const mutationEndpoint = HttpApiEndpoint.put("testMutation", "/mutation-test")
  .setPayload(Schema.Literal("success", "error", "die"))
  .addSuccess(HelloResponse)
  .addError(HttpApiError.BadRequest);

export const ApiGroup = HttpApiGroup.make("api").add(mutationEndpoint).prefix("/api");

export const Api = HttpApi.make("example-api").add(ApiGroup);
