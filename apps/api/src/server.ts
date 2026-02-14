import Fastify from "fastify";
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";
import { registerWorkspaceRoutes } from "./routes/workspaces";
import { registerClusterRoutes } from "./routes/clusters";
import { registerJobRoutes } from "./routes/jobs";
import { registerNotebookRoutes } from "./routes/notebooks";
import { registerPipelineRoutes } from "./routes/pipelines";
import { registerSqlWarehouseRoutes } from "./routes/sql-warehouses";
import { registerWebhookRoutes } from "./routes/webhooks";

export async function buildServer() {
  const app = Fastify({ logger: true });
  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerClusterRoutes(app);
  await registerJobRoutes(app);
  await registerNotebookRoutes(app);
  await registerPipelineRoutes(app);
  await registerSqlWarehouseRoutes(app);
  await registerWebhookRoutes(app);
  return app;
}

if (require.main === module) {
  buildServer()
    .then((app) => app.listen({ port: 3000 }))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
