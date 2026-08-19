import { ROUTE_NAME } from '@/constants/routes.js'
import { setUnauthorizedHandler } from '@/services/api.js'

async function refreshWithSharedLock(authStore, expiredAccessToken, authTabSync) {
  const refresh = async () => {
    await authTabSync?.requestPeerSession(expiredAccessToken)
    const sharedAccessToken = authStore.accessToken
    if (sharedAccessToken && sharedAccessToken !== expiredAccessToken) {
      return sharedAccessToken
    }

    await authStore.refreshSession()

    if (!authStore.accessToken) {
      throw new Error('Refresh response did not include an access token')
    }

    return authStore.accessToken
  }

  return authTabSync?.withRefreshLock
    ? authTabSync.withRefreshLock(refresh)
    : refresh()
}

export function configureAuthSessionRecovery(authStore, router, authTabSync) {
  setUnauthorizedHandler(async () => {
    const expiredAccessToken = authStore.accessToken

    try {
      return await refreshWithSharedLock(authStore, expiredAccessToken, authTabSync)
    } catch (error) {
      await authTabSync?.requestPeerSession(expiredAccessToken)
      const sharedAccessToken = authStore.accessToken
      if (sharedAccessToken && sharedAccessToken !== expiredAccessToken) {
        return sharedAccessToken
      }

      const currentRoute = router.currentRoute.value
      const redirect = currentRoute.meta.requiresAuth ? currentRoute.fullPath : null

      authStore.clearSession()

      if (currentRoute.name !== ROUTE_NAME.LOGIN) {
        await router.replace({
          name: ROUTE_NAME.LOGIN,
          query: redirect ? { redirect } : {},
        })
      }

      throw error
    }
  })
}
