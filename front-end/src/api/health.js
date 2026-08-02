import { api } from '@/services/api.js'

export const healthApi = {
    check: () => api.get('/health', { token: null }),
    readiness: () => api.get('/health/ready', { token: null }),
}
