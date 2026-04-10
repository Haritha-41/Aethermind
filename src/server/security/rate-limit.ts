type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const globalRateLimitStore = globalThis as unknown as {
  requestRateLimitMap?: Map<string, RateLimitEntry>;
};

function getRateLimitMap(): Map<string, RateLimitEntry> {
  if (!globalRateLimitStore.requestRateLimitMap) {
    globalRateLimitStore.requestRateLimitMap = new Map<string, RateLimitEntry>();
  }

  return globalRateLimitStore.requestRateLimitMap;
}

function pruneExpiredEntries(now: number, map: Map<string, RateLimitEntry>): void {
  for (const [key, entry] of map.entries()) {
    if (entry.expiresAt <= now) {
      map.delete(key);
    }
  }
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function enforceRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const map = getRateLimitMap();
  pruneExpiredEntries(now, map);

  const existingEntry = map.get(config.key);
  if (!existingEntry || existingEntry.expiresAt <= now) {
    map.set(config.key, {
      count: 1,
      expiresAt: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(config.limit - 1, 0),
      retryAfterSeconds: 0,
    };
  }

  if (existingEntry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        Math.ceil((existingEntry.expiresAt - now) / 1000),
        1,
      ),
    };
  }

  existingEntry.count += 1;
  map.set(config.key, existingEntry);
  return {
    allowed: true,
    remaining: Math.max(config.limit - existingEntry.count, 0),
    retryAfterSeconds: 0,
  };
}

