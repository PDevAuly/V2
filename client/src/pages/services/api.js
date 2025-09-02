// zentraler Fetch-Wrapper
export const API_BASE = '/api';

const parseJSONSafe = (text) => {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
};

export async function fetchJSON(path, init) {
  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    const parsed = parseJSONSafe(text);
    const msg = parsed?.error || parsed?.message || text || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return parseJSONSafe(text);
}
