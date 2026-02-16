import { z } from "zod";

const DATASTACK_BASE_URL =
  process.env.DATASTACK_API_URL ?? "http://localhost:3000";

async function apiFetch(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const url = `${DATASTACK_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "x-datastack-scope": "admin",
    "content-type": "application/json",
  };
  const apiKey = process.env.DATASTACK_API_KEY;
  if (apiKey) {
    headers["authorization"] = `Bearer ${apiKey}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataStack API ${method} ${path} returned ${res.status}: ${text}`);
  }
  if (res.status === 204) return { success: true };
  return res.json();
}

function textResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, z.ZodType>;
  handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
}

export const datastackTools: ToolDefinition[] = [
  {
    name: "list_workspaces",
    description: "List all DataStack workspaces the caller has access to.",
    schema: {
      pageSize: z.number().optional().describe("Number of results per page (default 25)"),
      pageToken: z.string().optional().describe("Pagination token"),
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.pageSize != null) params.set("pageSize", String(args.pageSize));
      if (args.pageToken != null) params.set("pageToken", String(args.pageToken));
      const qs = params.toString();
      return textResult(await apiFetch("GET", `/v1/workspaces${qs ? `?${qs}` : ""}`));
    },
  },
  {
    name: "get_workspace",
    description: "Get a DataStack workspace by its ID.",
    schema: {
      workspaceId: z.string().describe("Workspace ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("GET", `/v1/workspaces/${args.workspaceId}`));
    },
  },
  {
    name: "list_clusters",
    description: "List compute clusters. Optionally filter by state.",
    schema: {
      workspaceId: z.string().optional().describe("Workspace ID to filter by"),
      state: z
        .enum(["PENDING", "RUNNING", "TERMINATING", "TERMINATED", "ERROR"])
        .optional()
        .describe("Cluster state filter"),
      page: z.number().optional().describe("Page number (default 1)"),
      pageSize: z.number().optional().describe("Results per page (default 25)"),
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.workspaceId != null) params.set("workspaceId", String(args.workspaceId));
      if (args.state != null) params.set("state", String(args.state));
      if (args.page != null) params.set("page", String(args.page));
      if (args.pageSize != null) params.set("pageSize", String(args.pageSize));
      const qs = params.toString();
      return textResult(await apiFetch("GET", `/v1/clusters${qs ? `?${qs}` : ""}`));
    },
  },
  {
    name: "get_cluster",
    description: "Get a compute cluster by its ID.",
    schema: {
      clusterId: z.string().describe("Cluster ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("GET", `/v1/clusters/${args.clusterId}`));
    },
  },
  {
    name: "create_cluster",
    description: "Create a new compute cluster.",
    schema: {
      name: z.string().describe("Cluster name"),
      workspaceId: z.string().describe("Workspace ID"),
      sparkVersion: z.string().describe("Spark runtime version"),
      nodeType: z.string().describe("Instance type for worker nodes"),
      workerCount: z.number().optional().describe("Number of workers"),
      enableAutoscaling: z.boolean().optional().describe("Enable autoscaling"),
      minWorkers: z.number().optional().describe("Min workers when autoscaling"),
      maxWorkers: z.number().optional().describe("Max workers when autoscaling"),
      autoTerminationMinutes: z.number().optional().describe("Auto-terminate idle cluster after N minutes"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("POST", "/v1/clusters", args));
    },
  },
  {
    name: "terminate_cluster",
    description: "Terminate a compute cluster. Billing stops when termination completes.",
    schema: {
      clusterId: z.string().describe("Cluster ID to terminate"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("DELETE", `/v1/clusters/${args.clusterId}`));
    },
  },
  {
    name: "resize_cluster",
    description: "Resize a running cluster by changing its worker count.",
    schema: {
      clusterId: z.string().describe("Cluster ID"),
      workerCount: z.number().describe("New number of workers"),
      minWorkers: z.number().optional().describe("Min workers"),
      maxWorkers: z.number().optional().describe("Max workers"),
    },
    handler: async (args) => {
      const { clusterId, ...body } = args;
      return textResult(await apiFetch("POST", `/v1/clusters/${clusterId}/resize`, body));
    },
  },
  {
    name: "list_jobs",
    description: "List all jobs in the workspace.",
    schema: {
      workspaceId: z.string().optional().describe("Workspace ID filter"),
      limit: z.number().optional().describe("Max results (default 25)"),
      offset: z.number().optional().describe("Offset for pagination"),
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.workspaceId != null) params.set("workspaceId", String(args.workspaceId));
      if (args.limit != null) params.set("limit", String(args.limit));
      if (args.offset != null) params.set("offset", String(args.offset));
      const qs = params.toString();
      return textResult(await apiFetch("GET", `/v1/jobs${qs ? `?${qs}` : ""}`));
    },
  },
  {
    name: "get_job",
    description: "Get a job by its ID.",
    schema: {
      jobId: z.number().describe("Job ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("GET", `/v1/jobs/${args.jobId}`));
    },
  },
  {
    name: "trigger_job_run",
    description: "Trigger a job run immediately. Returns the run ID for polling.",
    schema: {
      jobId: z.number().describe("Job ID to trigger"),
      pythonParams: z.array(z.string()).optional().describe("Python parameters"),
      sparkSubmitParams: z.array(z.string()).optional().describe("Spark submit parameters"),
      idempotencyKey: z.string().optional().describe("Idempotency key"),
    },
    handler: async (args) => {
      const { jobId, ...body } = args;
      return textResult(await apiFetch("POST", `/v1/jobs/${jobId}/runs`, body));
    },
  },
  {
    name: "get_job_run",
    description: "Get state and timing for a single job run.",
    schema: {
      jobId: z.number().describe("Job ID"),
      runId: z.number().describe("Run ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("GET", `/v1/jobs/${args.jobId}/runs/${args.runId}`));
    },
  },
  {
    name: "list_notebooks",
    description: "List notebooks in the workspace.",
    schema: {
      pathPrefix: z.string().optional().describe("Filter by path prefix"),
      limit: z.number().optional().describe("Max results (default 25)"),
      offset: z.number().optional().describe("Offset for pagination"),
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.pathPrefix != null) params.set("pathPrefix", String(args.pathPrefix));
      if (args.limit != null) params.set("limit", String(args.limit));
      if (args.offset != null) params.set("offset", String(args.offset));
      const qs = params.toString();
      return textResult(await apiFetch("GET", `/v1/notebooks${qs ? `?${qs}` : ""}`));
    },
  },
  {
    name: "export_notebook",
    description: "Export a notebook in the requested format (SOURCE, HTML, JUPYTER).",
    schema: {
      path: z.string().describe("Notebook path"),
      format: z.enum(["SOURCE", "HTML", "JUPYTER"]).describe("Export format"),
    },
    handler: async (args) => {
      const params = new URLSearchParams({
        path: String(args.path),
        format: String(args.format),
      });
      return textResult(await apiFetch("GET", `/v1/notebooks/export?${params.toString()}`));
    },
  },
  {
    name: "create_notebook",
    description: "Create or overwrite a notebook at the given path.",
    schema: {
      path: z.string().describe("Notebook path"),
      language: z.enum(["PYTHON", "SQL", "SCALA", "R"]).describe("Notebook language"),
      content: z.string().optional().describe("Notebook content"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("PUT", "/v1/notebooks", args));
    },
  },
  {
    name: "list_pipelines",
    description: "List Delta Live Tables pipelines in the workspace.",
    schema: {
      workspaceId: z.string().optional().describe("Workspace ID filter"),
      state: z
        .enum(["IDLE", "RUNNING", "FAILED", "STOPPING", "DELETED"])
        .optional()
        .describe("Pipeline state filter"),
      pageSize: z.number().optional().describe("Results per page (default 25)"),
      pageToken: z.string().optional().describe("Pagination token"),
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.workspaceId != null) params.set("workspaceId", String(args.workspaceId));
      if (args.state != null) params.set("state", String(args.state));
      if (args.pageSize != null) params.set("pageSize", String(args.pageSize));
      if (args.pageToken != null) params.set("pageToken", String(args.pageToken));
      const qs = params.toString();
      return textResult(await apiFetch("GET", `/v1/pipelines${qs ? `?${qs}` : ""}`));
    },
  },
  {
    name: "get_pipeline",
    description: "Get a pipeline by its ID.",
    schema: {
      pipelineId: z.string().describe("Pipeline ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("GET", `/v1/pipelines/${args.pipelineId}`));
    },
  },
  {
    name: "create_pipeline",
    description: "Create a new Delta Live Tables pipeline.",
    schema: {
      name: z.string().describe("Pipeline name"),
      workspaceId: z.string().describe("Workspace ID"),
      target: z.enum(["DEVELOPMENT", "PRODUCTION"]).describe("Target environment"),
      catalog: z.string().optional().describe("Unity Catalog name"),
      schema: z.string().optional().describe("Target schema"),
      continuous: z.boolean().optional().describe("Run continuously"),
      photon: z.boolean().optional().describe("Enable Photon acceleration"),
      edition: z.enum(["CORE", "PRO", "ADVANCED"]).optional().describe("DLT edition"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("POST", "/v1/pipelines", args));
    },
  },
  {
    name: "delete_pipeline",
    description: "Delete a pipeline and all associated resources.",
    schema: {
      pipelineId: z.string().describe("Pipeline ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("DELETE", `/v1/pipelines/${args.pipelineId}`));
    },
  },
  {
    name: "start_pipeline",
    description: "Start a pipeline update (full refresh or incremental).",
    schema: {
      pipelineId: z.string().describe("Pipeline ID"),
      fullRefresh: z.boolean().optional().describe("Force full refresh"),
      refreshSelection: z.array(z.string()).optional().describe("Tables to refresh"),
    },
    handler: async (args) => {
      const { pipelineId, ...body } = args;
      return textResult(await apiFetch("POST", `/v1/pipelines/${pipelineId}/start`, body));
    },
  },
  {
    name: "stop_pipeline",
    description: "Stop a running pipeline.",
    schema: {
      pipelineId: z.string().describe("Pipeline ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("POST", `/v1/pipelines/${args.pipelineId}/stop`));
    },
  },
  {
    name: "list_pipeline_events",
    description: "List recent events for a pipeline run.",
    schema: {
      pipelineId: z.string().describe("Pipeline ID"),
      limit: z.number().optional().describe("Max events to return (default 50)"),
      orderBy: z
        .enum(["timestamp_asc", "timestamp_desc"])
        .optional()
        .describe("Sort order"),
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.limit != null) params.set("limit", String(args.limit));
      if (args.orderBy != null) params.set("orderBy", String(args.orderBy));
      const qs = params.toString();
      return textResult(
        await apiFetch("GET", `/v1/pipelines/${args.pipelineId}/events${qs ? `?${qs}` : ""}`)
      );
    },
  },
  {
    name: "list_sql_warehouses",
    description: "List SQL warehouses in the workspace.",
    schema: {
      workspaceId: z.string().optional().describe("Workspace ID filter"),
      state: z
        .enum(["STARTING", "RUNNING", "STOPPING", "STOPPED", "DELETED"])
        .optional()
        .describe("Warehouse state filter"),
      page: z.number().optional().describe("Page number (default 1)"),
      pageSize: z.number().optional().describe("Results per page (default 25)"),
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.workspaceId != null) params.set("workspaceId", String(args.workspaceId));
      if (args.state != null) params.set("state", String(args.state));
      if (args.page != null) params.set("page", String(args.page));
      if (args.pageSize != null) params.set("pageSize", String(args.pageSize));
      const qs = params.toString();
      return textResult(await apiFetch("GET", `/v1/sql/warehouses${qs ? `?${qs}` : ""}`));
    },
  },
  {
    name: "get_sql_warehouse",
    description: "Get a SQL warehouse by its ID, including connection URLs.",
    schema: {
      warehouseId: z.string().describe("Warehouse ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("GET", `/v1/sql/warehouses/${args.warehouseId}`));
    },
  },
  {
    name: "start_sql_warehouse",
    description: "Start a stopped SQL warehouse. Billing begins when running.",
    schema: {
      warehouseId: z.string().describe("Warehouse ID"),
    },
    handler: async (args) => {
      return textResult(
        await apiFetch("POST", `/v1/sql/warehouses/${args.warehouseId}/start`)
      );
    },
  },
  {
    name: "stop_sql_warehouse",
    description: "Stop a running SQL warehouse. Billing stops when stopped.",
    schema: {
      warehouseId: z.string().describe("Warehouse ID"),
    },
    handler: async (args) => {
      return textResult(
        await apiFetch("POST", `/v1/sql/warehouses/${args.warehouseId}/stop`)
      );
    },
  },
  {
    name: "list_users",
    description: "List users with optional role/status filters and pagination.",
    schema: {
      page: z.number().optional().describe("Page number (default 1)"),
      perPage: z.number().optional().describe("Results per page (default 20)"),
      role: z.enum(["admin", "editor", "viewer"]).optional().describe("Role filter"),
      status: z
        .enum(["active", "suspended", "pending_verification"])
        .optional()
        .describe("Status filter"),
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.page != null) params.set("page", String(args.page));
      if (args.perPage != null) params.set("perPage", String(args.perPage));
      if (args.role != null) params.set("role", String(args.role));
      if (args.status != null) params.set("status", String(args.status));
      const qs = params.toString();
      return textResult(await apiFetch("GET", `/v1/users${qs ? `?${qs}` : ""}`));
    },
  },
  {
    name: "get_user",
    description: "Get a user by their ID.",
    schema: {
      userId: z.string().describe("User ID"),
    },
    handler: async (args) => {
      return textResult(await apiFetch("GET", `/v1/users/${args.userId}`));
    },
  },
];
