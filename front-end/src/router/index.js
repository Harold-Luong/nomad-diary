import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { routes } from './routes.js'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    if (!authStore.initialized) await authStore.initialize()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        return {
            name: ROUTE_NAME.LOGIN,
            query: { redirect: to.fullPath },
        }
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
        return { name: ROUTE_NAME.TRIPS }
    }

    document.title = to.meta.title
        ? `${to.meta.title} · Nomad Diary`
        : 'Nomad Diary'

    return true
})

export default router
