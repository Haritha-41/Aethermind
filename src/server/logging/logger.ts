type LogLevel = "info" | "warn" | "error";
type LogMeta = Record<string, unknown> | undefined;

function writeLog(level: LogLevel, event: string, meta?: LogMeta): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  };

  const serialized = JSON.stringify(payload);
  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export const logger = {
  info: (event: string, meta?: LogMeta) => writeLog("info", event, meta),
  warn: (event: string, meta?: LogMeta) => writeLog("warn", event, meta),
  error: (event: string, meta?: LogMeta) => writeLog("error", event, meta),
};
