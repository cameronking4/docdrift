import Fastify from "fastify";
import { registerUserRoutes } from "./routes/users";

export async function buildServer() {
  const app = Fastify({ logger: true });
  await registerUserRoutes(app);
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
