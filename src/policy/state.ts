import path from "node:path";
import { StateStore, emptyState } from "../model/state";
import { readJsonFile, writeJsonFile } from "../utils/fs";

const statePath = path.resolve(".docdrift", "state.json");

export function loadState(): StateStore {
  return readJsonFile<StateStore>(statePath, emptyState());
}

export function saveState(state: StateStore): void {
  writeJsonFile(statePath, state);
}
