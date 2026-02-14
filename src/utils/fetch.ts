import https from "node:https";
import http from "node:http";

const TIMEOUT_MS = 30_000;

function getAgent(_url: string): http.Agent | https.Agent | undefined {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxy) {
    try {
      const { HttpsProxyAgent } = require("https-proxy-agent");
      return new HttpsProxyAgent(proxy) as https.Agent;
    } catch {
      // Optional dependency not installed
    }
  }
  return undefined;
}

/**
 * Fetch a URL and return the response body as string.
 * Respects HTTP_PROXY, HTTPS_PROXY; 30s timeout; follows redirects.
 */
export async function fetchSpec(url: string): Promise<string> {
  const parsed = new URL(url);
  const isHttps = parsed.protocol === "https:";
  const agent = getAgent(url);

  return new Promise((resolve, reject) => {
    const req = (isHttps ? https : http).get(
      url,
      { agent: agent ?? undefined, timeout: TIMEOUT_MS },
      (res) => {
        const redirect = res.headers.location;
        if (redirect && [301, 302, 307, 308].includes(res.statusCode ?? 0)) {
          req.destroy();
          fetchSpec(new URL(redirect, url).href).then(resolve).catch(reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Fetch timeout after ${TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
  });
}

/**
 * POST to a URL with JSON body (e.g. GraphQL introspection).
 */
export async function fetchSpecPost(url: string, body: object): Promise<string> {
  const parsed = new URL(url);
  const isHttps = parsed.protocol === "https:";
  const agent = getAgent(url);
  const bodyStr = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
      ...(agent && { agent }),
      timeout: TIMEOUT_MS,
    };

    const req = (isHttps ? https : http).request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Fetch timeout after ${TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}
