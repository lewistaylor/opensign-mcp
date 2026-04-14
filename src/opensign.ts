export const BASE_URL = "https://app.opensignlabs.com/api/v1";

const SAFE_ID = /^[a-zA-Z0-9]{1,50}$/;

/**
 * Validates that a value looks like a safe OpenSign entity ID.
 * Prevents path-traversal or URL-manipulation via crafted IDs
 * that get interpolated into API paths.
 */
export function assertId(value: string, name: string): void {
  if (!SAFE_ID.test(value)) {
    throw new Error(
      `Invalid ${name}: expected an alphanumeric ID, got "${value}"`,
    );
  }
}

/**
 * Retrieves the OpenSign API token from environment variables.
 * Throws immediately if not set so the server fails fast on startup.
 */
export function getApiToken(): string {
  const token = process.env.OPENSIGN_API_TOKEN;
  if (!token) {
    throw new Error("OPENSIGN_API_TOKEN environment variable is required");
  }
  return token;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string>;
  body?: unknown;
}

/**
 * Builds a full OpenSign API URL from a path and optional query parameters.
 * Empty/null/undefined param values are silently skipped.
 */
export function buildUrl(
  path: string,
  params?: Record<string, string>,
): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }
  return url.toString();
}

/**
 * Makes an authenticated request to the OpenSign API.
 * Handles JSON and text response bodies, and throws on non-2xx status.
 */
export async function opensignRequest(
  path: string,
  options: RequestOptions = {},
) {
  const { method = "GET", params, body } = options;
  const url = buildUrl(path, params);

  const headers: Record<string, string> = {
    "x-api-token": getApiToken(),
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenSign API error ${response.status}: ${text}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

/**
 * Wraps a tool handler so that thrown errors are returned as MCP error
 * content (`isError: true`) rather than crashing the transport.
 */
export function safeHandler<T extends Record<string, unknown>>(
  handler: (
    args: T,
  ) => Promise<{ content: Array<{ type: "text"; text: string }> }>,
) {
  return async (args: T) => {
    try {
      return await handler(args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}

/**
 * Convenience wrapper that serialises data as pretty-printed JSON
 * in MCP text content format.
 */
export function jsonContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** Valid document status types for list queries. */
export const DOC_TYPES = [
  "Draft",
  "In-Progress",
  "Completed",
  "Expired",
  "Declined",
] as const;

export type DocType = (typeof DOC_TYPES)[number];
