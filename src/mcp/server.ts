import path from "node:path";
import { datastackTools } from "./tools";

const sdkServer = require("@modelcontextprotocol/sdk/server/mcp");
const McpServer = sdkServer.McpServer;

const serverDir = path.dirname(require.resolve("@modelcontextprotocol/sdk/server"));
const StdioServerTransport = require(path.join(serverDir, "stdio.js")).StdioServerTransport;
const StreamableHTTPServerTransport = require(path.join(serverDir, "streamableHttp.js"))
  .StreamableHTTPServerTransport;

function getVersion(): string {
  try {
    const p = path.join(__dirname, "..", "..", "package.json");
    return (require(p) as { version?: string }).version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function createServer(): InstanceType<typeof McpServer> {
  const server = new McpServer(
    { name: "datastack", version: getVersion() },
    {}
  );

  for (const tool of datastackTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.schema,
      async (args: Record<string, unknown>) => tool.handler(args)
    );
  }

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[datastack-mcp] stdio server running");
}

export interface HttpServerOptions {
  port?: number;
  host?: string;
}

export async function startHttpServer(
  options: HttpServerOptions = {}
): Promise<void> {
  const http = await import("node:http");
  const { randomUUID } = await import("node:crypto");

  const port = options.port ?? parseInt(process.env.MCP_PORT ?? "8080", 10);
  const host = options.host ?? "0.0.0.0";

  const sessions = new Map<string, InstanceType<typeof StreamableHTTPServerTransport>>();

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (req.method === "POST") {
      if (sessionId && sessions.has(sessionId)) {
        const transport = sessions.get(sessionId)!;
        await transport.handleRequest(req, res);
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const server = createServer();
      await server.connect(transport);

      const newSessionId = transport.sessionId as string;
      sessions.set(newSessionId, transport);

      transport.onclose = () => {
        sessions.delete(newSessionId);
      };

      await transport.handleRequest(req, res);
      return;
    }

    if (req.method === "GET") {
      if (!sessionId || !sessions.has(sessionId)) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Missing or invalid session ID" }));
        return;
      }
      const transport = sessions.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    if (req.method === "DELETE") {
      if (sessionId && sessions.has(sessionId)) {
        const transport = sessions.get(sessionId)!;
        await transport.close();
        sessions.delete(sessionId);
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    res.writeHead(405, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  });

  httpServer.listen(port, host, () => {
    console.error(`[datastack-mcp] HTTP server listening on http://${host}:${port}/mcp`);
  });
}
