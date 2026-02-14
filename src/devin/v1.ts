import fs from "node:fs";
import path from "node:path";

export interface CreateSessionResponse {
  session_id: string;
  url: string;
  is_new_session?: boolean | null;
}

export interface DevinSession {
  session_id?: string;
  id?: string;
  url?: string;
  status?: string;
  status_enum?: string;
  structured_output?: unknown;
  data?: Record<string, unknown>;
  pull_request_url?: string;
  pr_url?: string;
}

function ensureOk(response: Response, body: string, context: string): void {
  if (!response.ok) {
    throw new Error(`${context} failed: ${response.status} ${body}`);
  }
}

export async function devinUploadAttachment(apiKey: string, filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  const bytes = fs.readFileSync(resolved);
  const blob = new Blob([bytes]);
  const form = new FormData();
  form.append("file", blob, path.basename(filePath));

  const response = await fetch("https://api.devin.ai/v1/attachments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const text = await response.text();
  ensureOk(response, text, "Upload attachment");

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") {
      return parsed;
    }
    if (parsed?.url && typeof parsed.url === "string") {
      return parsed.url;
    }
    throw new Error("Unexpected attachment response payload");
  } catch (error) {
    throw new Error(`Unable to parse attachment response: ${String(error)}`);
  }
}

export async function devinCreateSession(
  apiKey: string,
  body: unknown
): Promise<CreateSessionResponse> {
  const response = await fetch("https://api.devin.ai/v1/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  ensureOk(response, text, "Create session");
  return JSON.parse(text) as CreateSessionResponse;
}

export async function devinGetSession(apiKey: string, sessionId: string): Promise<DevinSession> {
  const response = await fetch(`https://api.devin.ai/v1/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await response.text();
  ensureOk(response, text, "Get session");
  return JSON.parse(text) as DevinSession;
}

export async function devinListSessions(
  apiKey: string,
  params: { limit?: number; tag?: string } = {}
): Promise<DevinSession[]> {
  const url = new URL("https://api.devin.ai/v1/sessions");
  if (params.limit) {
    url.searchParams.set("limit", String(params.limit));
  }
  if (params.tag) {
    url.searchParams.set("tag", params.tag);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await response.text();
  ensureOk(response, text, "List sessions");
  const parsed = JSON.parse(text) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as DevinSession[];
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).sessions)) {
    return (parsed as any).sessions as DevinSession[];
  }

  return [];
}

const TERMINAL_STATUSES = [
  "finished",
  "blocked",
  "error",
  "cancelled",
  "done",
  "complete",
  "completed",
  "success",
  "terminated",
];

function hasPrUrl(session: DevinSession): boolean {
  if (typeof session.pull_request_url === "string" && session.pull_request_url) return true;
  if (typeof session.pr_url === "string" && session.pr_url) return true;
  const structured = (session.structured_output ?? (session.data as any)?.structured_output) as any;
  if (structured?.pr?.url) return true;
  return false;
}

export async function pollUntilTerminal(
  apiKey: string,
  sessionId: string,
  timeoutMs = 30 * 60_000
): Promise<DevinSession> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const session = await devinGetSession(apiKey, sessionId);
    const status = String(session.status_enum ?? session.status ?? "UNKNOWN").toLowerCase();
    if (TERMINAL_STATUSES.includes(status)) {
      return session;
    }
    // Session already produced a PR; stop polling so we don't timeout waiting for status to flip
    if (hasPrUrl(session)) {
      return session;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`Session polling timed out for ${sessionId}`);
}
