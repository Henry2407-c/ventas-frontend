const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const get = (k) => localStorage.getItem(k)

export function saveSession(data) {
  localStorage.setItem('token', data.access_token)
  localStorage.setItem('refresh', data.refresh_token || '')
  if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
}
export function clearSession() {
  ;['token', 'refresh', 'user'].forEach((k) => localStorage.removeItem(k))
}

function errorMsg(body, status) {
  const d = body?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((e) => `${(e.loc || []).slice(-1)[0]}: ${e.msg}`).join(' · ')
  return `Error ${status}`
}

async function refreshToken() {
  const r = get('refresh')
  if (!r) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh?refresh_token=${encodeURIComponent(r)}`, { method: 'POST' })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('refresh', data.refresh_token)
    return true
  } catch {
    return false
  }
}

async function request(method, path, body, retry = true) {
  const headers = { Accept: 'application/json' }
  const token = get('token')
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?')
  }

  if (res.status === 401 && token && retry && path !== '/auth/login') {
    if (await refreshToken()) return request(method, path, body, false)
    clearSession()
    window.location.href = '/ingresar'
    throw new Error('Tu sesión expiró')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const e = new Error(errorMsg(data, res.status))
    e.status = res.status
    throw e
  }
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  put: (p, b) => request('PUT', p, b ?? {}),
  patch: (p, b) => request('PATCH', p, b ?? {}),
  del: (p) => request('DELETE', p),
}

export const qs = (o = {}) => {
  const p = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && p.append(k, v))
  const s = p.toString()
  return s ? `?${s}` : ''
}