import { ConvexHttpClient } from "convex/browser";

import { getConvexUrl } from "@/lib/config/env";

const globalForConvex = globalThis as unknown as {
  convexClient?: ConvexHttpClient;
};

export function getConvexClient(): ConvexHttpClient {
  if (globalForConvex.convexClient) {
    return globalForConvex.convexClient;
  }

  const client = new ConvexHttpClient(getConvexUrl());

  if (process.env.NODE_ENV !== "production") {
    globalForConvex.convexClient = client;
  }

  return client;
}
