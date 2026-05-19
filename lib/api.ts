import { useAuthStore } from './store/authStore'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

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

interface FetchApiOptions extends RequestInit {
  rawBody?: boolean
}

function buildHeaders(token: string | null, init?: HeadersInit, rawBody?: boolean): Headers {
  const headers = new Headers(init)
  if (!rawBody) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export async function fetchApi<T>(
  path: string,
  options: FetchApiOptions = {}
): Promise<T> {
  const { rawBody, ...fetchOptions } = options
  const { accessToken } = useAuthStore.getState()
  const headers = buildHeaders(accessToken, fetchOptions.headers, rawBody)

  let res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
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
    const retryHeaders = buildHeaders(newToken, fetchOptions.headers, rawBody)
    res = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
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
