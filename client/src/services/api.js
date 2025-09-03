// client/src/services/api.js
export const API_BASE = process.env.REACT_APP_API_URL || '/api';

const parseJSONSafe = (text) => {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
};

// Helper um Authorization Header zu bekommen
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token && token !== 'dev-access-token' 
    ? { 'Authorization': `Bearer ${token}` }
    : {};
};

export async function fetchJSON(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s für Onboarding

  try {
    console.log(`🌐 API Call: ${API_BASE}${path}`);
    
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders(), // Automatisch Authorization Header hinzufügen
        ...init.headers, // User-spezifische Headers
      },
      signal: controller.signal,
      ...init,
    });
    
    const text = await res.text().catch(() => '');
    console.log(`📡 Response ${res.status}:`, text.substring(0, 200) + '...');
    
    if (!res.ok) {
      const parsed = parseJSONSafe(text);
      const msg = parsed?.error || parsed?.message || text || `HTTP ${res.status} ${res.statusText}`;
      console.error(`❌ API Error (${res.status}):`, msg);
      throw new Error(msg);
    }
    
    const result = parseJSONSafe(text);
    console.log('✅ API Success:', result);
    return result;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ API Timeout:', path);
      throw new Error('Request timeout - Server antwortet nicht');
    }
    console.error('❌ API Call failed:', error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}