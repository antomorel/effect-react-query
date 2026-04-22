import myReactSinglePageApp from "./index.html";

Bun.serve({
  routes: {
    "/": myReactSinglePageApp,
  },
  port: 3200,
});
