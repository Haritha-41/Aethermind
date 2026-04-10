import { ConvexError } from "convex/values";

const ACCESS_KEY_ENV_NAME = "CONVEX_SERVER_ACCESS_KEY";
const AUTH_SECRET_ENV_NAME = "AUTH_SECRET";

export function assertServerAccessKey(serverAccessKey: string): void {
  const expectedAccessKey =
    process.env[ACCESS_KEY_ENV_NAME] ?? process.env[AUTH_SECRET_ENV_NAME];
  if (!expectedAccessKey || !expectedAccessKey.trim()) {
    throw new ConvexError(
      `${ACCESS_KEY_ENV_NAME} or ${AUTH_SECRET_ENV_NAME} must be configured.`,
    );
  }

  if (serverAccessKey !== expectedAccessKey) {
    throw new ConvexError("Unauthorized Convex function access.");
  }
}
