// client/src/services/api.js
export const API_BASE = process.env.REACT_APP_API_URL || '/api';

const parseJSONSafe = (text) => {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
};

export async function fetchJSON(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...init,
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      const parsed = parseJSONSafe(text);
      const msg = parsed?.error || parsed?.message || text || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return parseJSONSafe(text);
  } finally {
    clearTimeout(timeout);
  }
}
