import { Elysia } from "elysia";
import { stripeWebhookRoutes } from "./routes/stripeWebhook";
import { reportRoutes } from "./routes/reports";

const app = new Elysia()
  .use(stripeWebhookRoutes)
  .use(reportRoutes)
  .listen(3333);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
