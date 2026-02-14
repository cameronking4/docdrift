import { DocAreaConfig, DocDriftConfig } from "../config/schema";
import { IdempotencyRecord, StateStore } from "../model/state";
import { DriftItem, PolicyAction, PolicyDecision } from "../model/types";
import { isPathAllowedAndNotExcluded } from "../utils/glob";
import { sha256 } from "../utils/hash";
import { scoreSignals } from "./confidence";

function ymd(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

function buildIdempotencyKey(input: {
  repo: string;
  docArea: string;
  baseSha: string;
  headSha: string;
  action: PolicyAction;
}): string {
  return sha256(`${input.repo}:${input.docArea}:${input.baseSha}:${input.headSha}:${input.action}`);
}

export function decidePolicy(input: {
  item: DriftItem;
  docAreaConfig: DocAreaConfig;
  config: DocDriftConfig;
  state: StateStore;
  repo: string;
  baseSha: string;
  headSha: string;
}): PolicyDecision {
  const { item, docAreaConfig, config, state } = input;
  const confidence = scoreSignals(item.signals);
  const threshold = config.policy.confidence.autopatchThreshold;
  const today = ymd();
  const hasStrongSignal = item.signals.some((signal) => signal.tier <= 1);
  const prCountToday = state.dailyPrCount[today] ?? 0;
  const capReached = prCountToday >= config.policy.prCaps.maxPrsPerDay;
  const areaDailyKey = `${today}:${item.docArea}`;
  const exceedsFileCap = item.impactedDocs.length > config.policy.prCaps.maxFilesTouched;
  const exclude = "exclude" in config && Array.isArray(config.exclude) ? config.exclude : [];
  const hasPathOutsideAllowlist = item.impactedDocs.some(
    (filePath) =>
      filePath && !isPathAllowedAndNotExcluded(filePath, config.policy.allowlist, exclude)
  );

  let action: PolicyAction = "NOOP";
  let reason = "No action needed";

  if (hasPathOutsideAllowlist) {
    action = "OPEN_ISSUE";
    reason = "Impacted files include non-allowlisted paths";
  } else if (exceedsFileCap) {
    action = "OPEN_ISSUE";
    reason = "Impacted files exceed maxFilesTouched policy cap";
  } else if (item.mode === "autogen") {
    if (!hasStrongSignal) {
      action = "OPEN_ISSUE";
      reason = "Autogen area without strong signal; escalate as issue";
    } else if (confidence < threshold) {
      action = "OPEN_ISSUE";
      reason = `Confidence ${confidence.toFixed(2)} below threshold ${threshold.toFixed(2)}`;
    } else if (capReached) {
      action = state.areaLatestPr[item.docArea] ? "UPDATE_EXISTING_PR" : "OPEN_ISSUE";
      reason = "Daily PR cap reached";
    } else if (state.areaDailyPrOpened[areaDailyKey]) {
      action = "UPDATE_EXISTING_PR";
      reason = "One PR per doc area per day bundling rule";
    } else {
      action = "OPEN_PR";
      reason = "Strong autogen signal with confidence above threshold";
    }
  } else {
    const requireHuman = Boolean(docAreaConfig.patch.requireHumanConfirmation);
    if (!requireHuman && hasStrongSignal && confidence >= Math.min(0.95, threshold + 0.1)) {
      action = "OPEN_PR";
      reason = "Conceptual area is high-confidence and human confirmation not required";
    } else {
      action = "OPEN_ISSUE";
      reason = "Conceptual drift defaults to human-in-the-loop issue";
    }
  }

  const idempotencyKey = buildIdempotencyKey({
    repo: input.repo,
    docArea: item.docArea,
    baseSha: input.baseSha,
    headSha: input.headSha,
    action,
  });

  if (state.idempotency[idempotencyKey]) {
    return {
      action: "NOOP",
      confidence,
      reason: "Idempotency key already processed",
      idempotencyKey,
    };
  }

  return {
    action,
    confidence,
    reason,
    idempotencyKey,
  };
}

export function applyDecisionToState(input: {
  state: StateStore;
  decision: PolicyDecision;
  docArea: string;
  outcome: "PR_OPENED" | "ISSUE_OPENED" | "NO_CHANGE" | "BLOCKED";
  link?: string;
}): StateStore {
  const today = ymd();
  const next: StateStore = JSON.parse(JSON.stringify(input.state)) as StateStore;

  const record: IdempotencyRecord = {
    createdAt: new Date().toISOString(),
    action: input.decision.action,
    outcome: input.outcome,
    link: input.link,
  };
  next.idempotency[input.decision.idempotencyKey] = record;

  if (input.outcome === "PR_OPENED") {
    next.dailyPrCount[today] = (next.dailyPrCount[today] ?? 0) + 1;
    next.areaDailyPrOpened[`${today}:${input.docArea}`] = input.link ?? "opened";
    if (input.link) {
      next.areaLatestPr[input.docArea] = input.link;
    }
  }

  return next;
}
