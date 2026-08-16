// In der lokalen Entwicklung leer lassen (Vite-Proxy übernimmt /api -> localhost:4000).
// In Produktion (z.B. Railway, wenn Client und Server auf unterschiedlichen Domains laufen)
// VITE_API_BASE zur Build-Zeit auf die volle Server-URL setzen, z.B.
// VITE_API_BASE=https://sbl-server-production.up.railway.app
const BASE = `${import.meta.env.VITE_API_BASE || ''}/api`;

async function request(path, { method = 'GET', body, params } = {}) {
  let url = `${BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Der Server antwortet nicht (Zeitüberschreitung). Bitte später erneut versuchen.');
    }
    throw new Error('Verbindung zum Server fehlgeschlagen.');
  } finally {
    clearTimeout(timeoutId);
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(data?.error || `Fehler ${res.status}`);
  }
  return data;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
