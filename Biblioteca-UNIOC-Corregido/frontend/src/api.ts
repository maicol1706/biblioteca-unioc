const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function token() {
  return localStorage.getItem("accessToken");
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  const access = token();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401 && localStorage.getItem("refreshToken")) {
    const refreshed = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") }),
    });
    if (refreshed.ok) {
      const data = await refreshed.json();
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      headers.set("Authorization", `Bearer ${data.accessToken}`);
      const retry = await fetch(`${API}${path}`, { ...options, headers });
      if (!retry.ok) throw await errorOf(retry);
      return retry.status === 204 ? (undefined as T) : retry.json();
    }
  }
  if (!res.ok) throw await errorOf(res);
  return res.status === 204 ? (undefined as T) : res.json();
}

async function errorOf(res: Response) {
  try {
    const body = await res.json();
    return new Error(body.message || body.error || `Error ${res.status}`);
  } catch {
    return new Error(`Error ${res.status}`);
  }
}

export async function upload<T = any>(path: string, file: File, query = ""): Promise<T> {
  const headers = new Headers();
  const access = token();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}${path}${query}`, { method: "POST", headers, body: form });
  if (!res.ok) throw await errorOf(res);
  return res.json();
}

export async function downloadAuthorized(path: string, filename: string) {
  const headers = new Headers();
  const access = token();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw await errorOf(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { API };
