import Fastify from "fastify";
import { registerUserRoutes } from "./routes/users";
import { registerWorkspaceRoutes } from "./routes/workspaces";
import { registerClusterRoutes } from "./routes/clusters";
import { registerJobRoutes } from "./routes/jobs";
import { registerNotebookRoutes } from "./routes/notebooks";
import { registerSqlWarehouseRoutes } from "./routes/sql-warehouses";

export async function buildServer() {
  const app = Fastify({ logger: true });
  await registerUserRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerClusterRoutes(app);
  await registerJobRoutes(app);
  await registerNotebookRoutes(app);
  await registerSqlWarehouseRoutes(app);
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
