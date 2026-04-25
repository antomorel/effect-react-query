import { HttpApiBuilder, HttpApiError, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Match } from "effect";
import { Api } from "./api";

export const ApiGroupLive = HttpApiBuilder.group(Api, "api", (handlers) =>
  handlers.handle("testMutation", ({ payload }) =>
    Match.value(payload).pipe(
      Match.when("success", () =>
        Effect.succeed({
          message: "Hello, world!",
          method: "GET",
        }),
      ),
      Match.when("error", () => Effect.fail(new HttpApiError.BadRequest())),
      Match.when("die", Effect.die),
      Match.exhaustive,
    ),
  ),
);

const ApiLive = HttpApiBuilder.api(Api).pipe(Layer.provide(ApiGroupLive));

const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(
    HttpApiBuilder.middlewareCors({
      allowedOrigins: ["http://localhost:3200"],
    }),
  ),
  Layer.provide(ApiLive),
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layer({ port: 3000 })),
);

BunRuntime.runMain(Layer.launch(ServerLive));
