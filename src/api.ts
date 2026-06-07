// ─── Konfigurasi API untuk seluruh frontend ─────────────────────────────────────
// Semua halaman import dari sini agar URL backend konsisten.

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Helper fetch yang sudah mengarah ke backend.
 * Otomatis menambahkan Content-Type JSON untuk non-FormData request.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${BACKEND_URL}${path}`;
  return fetch(url, options);
}

/**
 * Helper POST JSON ke backend.
 */
export async function apiPostJSON<T = unknown>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
