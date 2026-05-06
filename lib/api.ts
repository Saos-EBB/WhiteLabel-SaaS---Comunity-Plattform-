import { useAuthStore } from './store/authStore'

const BASE_URL = 'http://localhost:3000/api/v1'

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = await res.json() as { accessToken: string }
    useAuthStore.getState().setAccessToken(data.accessToken)
    return true
  } catch {
    return false
  }
}

function buildHeaders(token: string | null, init?: HeadersInit): Headers {
  const headers = new Headers(init)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = useAuthStore.getState()
  const headers = buildHeaders(accessToken, options.headers)

  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (!refreshed) {
      useAuthStore.getState().logout()
      throw new Error('Session expired')
    }
    const newToken = useAuthStore.getState().accessToken
    const retryHeaders = buildHeaders(newToken, options.headers)
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: retryHeaders,
    })
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? 'Request failed')
  }

  return res.json() as Promise<T>
}
