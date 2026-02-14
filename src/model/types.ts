export type TriggerKind = "push" | "manual" | "schedule" | "pull_request";

export interface RunInfo {
  runId: string;
  repo: string;
  baseSha: string;
  headSha: string;
  trigger: TriggerKind;
  timestamp: string;
  /** Set when trigger is pull_request */
  prNumber?: number;
}

export interface ChangeSet {
  changedPaths: string[];
  diffSummary: string;
  commits: string[];
}

export type SignalKind =
  | "docs_check_failed"
  | "openapi_diff"
  | "swagger2_diff"
  | "graphql_diff"
  | "fern_diff"
  | "postman_diff"
  | "infer_mode"
  | "heuristic_path_impact"
  | "weak_evidence";

export interface Signal {
  kind: SignalKind;
  tier: 0 | 1 | 2 | 3;
  confidence: number;
  evidence: string[];
}

export type DocAreaMode = "autogen" | "conceptual";

export interface DriftItem {
  docArea: string;
  mode: DocAreaMode;
  signals: Signal[];
  impactedDocs: string[];
  recommendedAction: PolicyAction;
  summary: string;
}

export interface DriftReport {
  run: Omit<RunInfo, "runId">;
  items: DriftItem[];
}

export type PolicyAction = "OPEN_PR" | "UPDATE_EXISTING_PR" | "OPEN_ISSUE" | "NOOP";

export interface PolicyDecision {
  action: PolicyAction;
  confidence: number;
  reason: string;
  idempotencyKey: string;
}

export interface Metrics {
  driftItemsDetected: number;
  prsOpened: number;
  issuesOpened: number;
  blockedCount: number;
  timeToSessionTerminalMs: number[];
  docAreaCounts: Record<string, number>;
  noiseRateProxy: number;
}

export interface RunResult {
  docArea: string;
  decision: PolicyDecision;
  outcome: "PR_OPENED" | "ISSUE_OPENED" | "NO_CHANGE" | "BLOCKED";
  sessionUrl?: string;
  prUrl?: string;
  issueUrl?: string;
  summary: string;
}

/** Aggregated drift result for single-session runs (one run = one item) */
export interface AggregatedDriftResult {
  signals: Signal[];
  impactedDocs: string[];
  summary: string;
}
