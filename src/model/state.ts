export interface IdempotencyRecord {
  createdAt: string;
  action: string;
  outcome: string;
  link?: string;
}

export interface StateStore {
  idempotency: Record<string, IdempotencyRecord>;
  dailyPrCount: Record<string, number>;
  areaDailyPrOpened: Record<string, string>;
  areaLatestPr: Record<string, string>;
  /** Single-session: last doc-drift PR we opened (for SLA check) */
  lastDocDriftPrUrl?: string;
  lastDocDriftPrOpenedAt?: string;
  /** Idempotency for SLA issues (avoid duplicate "merge doc drift PR" issues) */
  lastSlaIssueOpenedAt?: string;
}

export const emptyState = (): StateStore => ({
  idempotency: {},
  dailyPrCount: {},
  areaDailyPrOpened: {},
  areaLatestPr: {},
});
