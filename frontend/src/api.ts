// Cliente HTTP mínimo: añade el JWT a cada petición y expulsa al login si caduca.

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function loginUrl(): string {
  return `${API_URL}/api/auth/spotify/login`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "/";
    throw new Error("Sesión caducada");
  }
  if (!response.ok) {
    // La API devuelve { message } en los errores controlados
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? `Error ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function withJsonBody(method: string, body?: unknown): RequestInit {
  if (body === undefined) return { method };
  return {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  };
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, withJsonBody("POST", body)),
  put: <T>(path: string, body?: unknown) => request<T>(path, withJsonBody("PUT", body)),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
