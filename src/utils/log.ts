export function logInfo(message: string, meta?: Record<string, unknown>): void {
  if (meta) {
    console.log(`[docdrift] ${message}`, meta);
    return;
  }
  console.log(`[docdrift] ${message}`);
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  if (meta) {
    console.warn(`[docdrift] ${message}`, meta);
    return;
  }
  console.warn(`[docdrift] ${message}`);
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  if (meta) {
    console.error(`[docdrift] ${message}`, meta);
    return;
  }
  console.error(`[docdrift] ${message}`);
}
