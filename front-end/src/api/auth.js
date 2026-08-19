import { api } from '@/services/api.js'

export const authApi = {
    register: (payload) => api.post('/auth/register', payload, { token: null }),
    login: (payload) => api.post('/auth/login', payload, { token: null }),
    refreshToken: () => api.post('/auth/refresh-token', undefined, { token: null }),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    updateMe: (profile) => api.patch('/auth/me', profile),
    changePassword: (payload) => api.patch('/auth/change-password', payload),
    deleteAccount: (password) =>
        api.delete('/auth/account', { body: { password } }),
}
