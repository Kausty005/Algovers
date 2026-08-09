// ─── Base API client ─────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export { BASE_URL };

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    if (response.status === 402) {
      const err = new Error('Payment required') as Error & { status: number };
      err.status = 402;
      throw err;
    }
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
