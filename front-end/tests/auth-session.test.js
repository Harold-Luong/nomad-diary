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
