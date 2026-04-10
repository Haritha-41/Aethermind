function requireEnv(name: "CONVEX_URL" | "AUTH_SECRET"): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getConvexUrl(): string {
  return requireEnv("CONVEX_URL");
}

export function getAuthSecret(): string {
  const secret = requireEnv("AUTH_SECRET");
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters.");
  }

  return secret;
}

export function getConvexServerAccessKey(): string {
  const accessKey = process.env.CONVEX_SERVER_ACCESS_KEY?.trim();
  if (accessKey) {
    return accessKey;
  }

  return getAuthSecret();
}
