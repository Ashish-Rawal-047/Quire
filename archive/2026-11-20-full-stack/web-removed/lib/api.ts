/**
 * Thin client for the Quire API, reached through this app's own origin (`/api/*` is proxied to
 * FastAPI), so session cookies stay first-party. Mutations echo the CSRF cookie in a header.
 * The client never sends identities, roles or prices: the server derives those itself.
 */

export type Problem = {
  status: number;
  code: string;
  title: string;
  detail?: string;
  retry_after?: number;
  attempts_left?: number;
  errors?: { loc: string[]; msg: string }[];
};

export class ApiError extends Error {
  readonly problem: Problem;
  constructor(problem: Problem) {
    super(problem.title);
    this.problem = problem;
  }
  get status() {
    return this.problem.status;
  }
  get code() {
    return this.problem.code;
  }
}

const CSRF_COOKIES = ["__Host-quire_csrf", "quire_csrf"];

function csrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  for (const part of document.cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (CSRF_COOKIES.includes(name)) return rest.join("=");
  }
  return undefined;
}

export async function api<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET") {
    const token = csrfToken();
    if (token) headers["x-csrf-token"] = token;
  }
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError({ status: 0, code: "network", title: "Can't reach Quire. Check your connection and try again." });
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      code: data?.code ?? "error",
      title: data?.title ?? "Something went wrong",
      ...data,
    });
  }
  return data as T;
}

/** Only same-site relative paths are allowed as post-sign-in destinations (no open redirects). */
export function safeNextPath(raw: string | null | undefined, fallback = "/profile"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
