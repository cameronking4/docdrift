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
}

export const emptyState = (): StateStore => ({
  idempotency: {},
  dailyPrCount: {},
  areaDailyPrOpened: {},
  areaLatestPr: {}
});
