import { HttpApiBuilder, HttpApiError, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { Api } from "./api";

export const ApiGroupLive = HttpApiBuilder.group(Api, "api", (handlers) =>
  handlers
    .handle("success", () =>
      Effect.succeed({
        message: "Hello, world!",
        method: "GET",
      }),
    )
    .handle("error", () => new HttpApiError.BadRequest())
    .handle("die", Effect.die),
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
