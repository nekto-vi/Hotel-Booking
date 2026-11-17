const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4044";
const TOKEN_STORAGE_KEY = "hotel-booking-token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    authenticated = true,
    headers: requestHeaders,
    ...requestOptions
  } = options;
  const headers = new Headers(requestHeaders);

  if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (authenticated && typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    const responseText = await response.text();

    if (responseText) {
      try {
        const body: unknown = JSON.parse(responseText);
        if (typeof body === "object" && body !== null && "message" in body) {
          const apiMessage = body.message;
          message = Array.isArray(apiMessage)
            ? apiMessage.join(", ")
            : String(apiMessage);
        } else {
          message = responseText;
        }
      } catch {
        message = responseText;
      }
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string, options?: ApiRequestOptions) {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions,
) {
  return apiRequest<T>(path, {
    ...options,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions,
) {
  return apiRequest<T>(path, {
    ...options,
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string, options?: ApiRequestOptions) {
  return apiRequest<T>(path, { ...options, method: "DELETE" });
}

export { TOKEN_STORAGE_KEY };
