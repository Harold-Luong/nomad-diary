import { beforeEach, expect, test, vi } from 'vitest'

import { tripsApi } from '@/api/trips.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { configureAuthSessionRecovery } from '@/services/auth-session.js'
import {
  clearAccessToken,
  clearUnauthorizedHandler,
  setAccessToken,
} from '@/services/api.js'

function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: 'ACCESS_TOKEN_EXPIRED', message: 'Access token expired' },
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )
}

beforeEach(() => {
  clearAccessToken()
  clearUnauthorizedHandler()
  vi.stubGlobal('fetch', vi.fn())
})

test('successful refresh returns the access token stored by the auth store', async () => {
  const authStore = {
    accessToken: null,
    refreshSession: vi.fn(async () => {
      authStore.accessToken = 'fresh-access-token'
      return null
    }),
    clearSession: vi.fn(),
  }
  const router = {
    currentRoute: {
      value: { name: ROUTE_NAME.TRIPS, fullPath: '/trips', meta: { requiresAuth: true } },
    },
    replace: vi.fn(),
  }
  configureAuthSessionRecovery(authStore, router)
  setAccessToken('expired-token')
  fetch
    .mockResolvedValueOnce(unauthorizedResponse())
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

  await tripsApi.list()

  expect(authStore.refreshSession).toHaveBeenCalledTimes(1)
  expect(fetch.mock.calls[1][1].headers.get('Authorization')).toBe(
    'Bearer fresh-access-token',
  )
  expect(authStore.clearSession).not.toHaveBeenCalled()
})

test('a tab reuses the token refreshed by another tab without rotating twice', async () => {
  const authStore = {
    accessToken: 'expired-token',
    refreshSession: vi.fn(),
    clearSession: vi.fn(),
  }
  const router = {
    currentRoute: {
      value: { name: ROUTE_NAME.TRIPS, fullPath: '/trips', meta: { requiresAuth: true } },
    },
    replace: vi.fn(),
  }
  const authTabSync = {
    requestPeerSession: vi.fn(async () => {
      authStore.accessToken = 'fresh-token-from-other-tab'
    }),
  }
  vi.stubGlobal('navigator', {
    locks: { request: vi.fn(async (_name, callback) => callback()) },
  })
  configureAuthSessionRecovery(authStore, router, authTabSync)
  setAccessToken('expired-token')
  fetch
    .mockResolvedValueOnce(unauthorizedResponse())
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

  await tripsApi.list()

  expect(authStore.refreshSession).not.toHaveBeenCalled()
  expect(authTabSync.requestPeerSession).toHaveBeenCalledWith('expired-token')
  expect(fetch.mock.calls[1][1].headers.get('Authorization')).toBe(
    'Bearer fresh-token-from-other-tab',
  )
  expect(authStore.clearSession).not.toHaveBeenCalled()
})

test('failed refresh clears the session and redirects back through login', async () => {
  const refreshError = new Error('Refresh token expired')
  const authStore = {
    refreshSession: vi.fn().mockRejectedValue(refreshError),
    clearSession: vi.fn(),
  }
  const router = {
    currentRoute: {
      value: {
        name: ROUTE_NAME.TRIPS,
        fullPath: '/trips?page=2',
        meta: { requiresAuth: true },
      },
    },
    replace: vi.fn().mockResolvedValue(undefined),
  }
  configureAuthSessionRecovery(authStore, router)
  setAccessToken('expired-token')
  fetch.mockResolvedValueOnce(unauthorizedResponse())

  await expect(tripsApi.list()).rejects.toMatchObject({ status: 401 })

  expect(authStore.refreshSession).toHaveBeenCalledTimes(1)
  expect(authStore.clearSession).toHaveBeenCalledTimes(1)
  expect(router.replace).toHaveBeenCalledWith({
    name: ROUTE_NAME.LOGIN,
    query: { redirect: '/trips?page=2' },
  })
})
