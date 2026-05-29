const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("atiToken");
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    throw new Error(`Cannot reach the backend API at ${API_BASE}. Make sure the backend server is running.`);
  }
  const text = await response.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })()
    : null;

  if (!response.ok) {
    const plainText = text && !text.trim().startsWith("<") ? text : "";
    const message = data?.message || plainText || `${response.status} ${response.statusText || "Request failed"}`.trim();
    const isAuthError = response.status === 401 && /authentication required|invalid token|token expired/i.test(message);

    if (isAuthError) {
      localStorage.removeItem("atiUser");
      localStorage.removeItem("atiToken");
      window.dispatchEvent(new Event("ati-auth-cleared"));
      throw new Error("Please log in again to continue.");
    }

    throw new Error(message);
  }

  return data;
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => escapeCell(row[key])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
