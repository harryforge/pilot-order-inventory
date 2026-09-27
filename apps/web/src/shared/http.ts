/** Error returned by the api: HTTP status plus the stable `code` and `details` of the body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  message?: string | string[];
  code?: string;
  details?: unknown;
}

async function readErrorBody(response: Response): Promise<ErrorBody> {
  try {
    return (await response.json()) as ErrorBody;
  } catch {
    return {};
  }
}

/** Sends a JSON request to the api (`/api` + path) and returns the JSON response. */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const body = await readErrorBody(response);
    // ValidationPipe errors carry a list of messages.
    const message = Array.isArray(body.message)
      ? body.message.join('; ')
      : (body.message ?? `Request failed with HTTP ${response.status}`);
    throw new ApiError(response.status, message, body.code, body.details);
  }
  return (await response.json()) as T;
}

/** Builds a query string from the non-empty values, for example `?customer=abc`. */
export function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (trimmed) {
      search.set(key, trimmed);
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
