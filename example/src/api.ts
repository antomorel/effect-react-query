import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export const HelloResponse = Schema.Struct({
  message: Schema.String,
  method: Schema.String,
});

const successEndpoint = HttpApiEndpoint.put("success", "/success").addSuccess(HelloResponse);
const errorEndpoint = HttpApiEndpoint.put("error", "/error").addError(HttpApiError.BadRequest);
const dieEndpoint = HttpApiEndpoint.put("die", "/die");

export const ApiGroup = HttpApiGroup.make("api")
  .add(successEndpoint)
  .add(errorEndpoint)
  .add(dieEndpoint)
  .prefix("/api");

export const Api = HttpApi.make("example-api").add(ApiGroup);
