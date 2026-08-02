import { ROUTE_NAME } from '@/constants/routes.js'
import { setUnauthorizedHandler } from '@/services/api.js'

export function configureAuthSessionRecovery(authStore, router) {
  setUnauthorizedHandler(async () => {
    try {
      const session = await authStore.refreshSession()
      return session.accessToken
    } catch (error) {
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
