import { defineStore } from 'pinia'

import { authApi } from '@/api/auth.js'
import {
    AUTH_SCHEME,
    STORAGE_KEY,
} from '@/constants/app.js'
import { clearAccessToken, setAccessToken } from '@/services/api.js'
import { runStoreRequest } from './request.js'
import { useReviewsStore } from './reviews.js'
import { useImagesStore } from './images.js'
import { useProvincesStore } from './provinces.js'
import { useTripsStore } from './trips.js'
import { useTripStopsStore } from './trip-stops.js'

function readStoredSession() {
    if (typeof window === 'undefined') return null

    try {
        const value = window.localStorage.getItem(STORAGE_KEY.AUTH_SESSION)
        return value ? JSON.parse(value) : null
    } catch {
        return null
    }
}

function writeStoredSession(session) {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(STORAGE_KEY.AUTH_SESSION, JSON.stringify(session))
    } catch {
        // The store still works in memory if browser storage is unavailable.
    }
}

function removeStoredSession() {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.removeItem(STORAGE_KEY.AUTH_SESSION)
    } catch {
        // Nothing else is required when browser storage is unavailable.
    }
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        accessToken: null,
        tokenType: AUTH_SCHEME.BEARER,
        accessTokenExpiresIn: null,
        initialized: false,
        loading: false,
        error: null,
    }),

    getters: {
        isAuthenticated: (state) => Boolean(state.accessToken && state.user),
    },

    actions: {
        async initialize() {
            const session = readStoredSession()

            if (session?.accessToken && session?.user) {
                this.applySession(session)
            } else {
                clearAccessToken()
                try {
                    await this.refreshSession()
                } catch {
                    this.clearSession()
                }
            }

            this.initialized = true
        },

        applySession(session) {
            if (
                this.user?.id &&
                session.user?.id &&
                String(this.user.id) !== String(session.user.id)
            ) {
                this.clearPrivateState()
            }

            this.user = session.user ?? this.user
            this.accessToken = session.accessToken
            this.tokenType = session.tokenType || AUTH_SCHEME.BEARER
            this.accessTokenExpiresIn = session.accessTokenExpiresIn ?? null
            setAccessToken(this.accessToken)
            writeStoredSession({
                user: this.user,
                accessToken: this.accessToken,
                tokenType: this.tokenType,
                accessTokenExpiresIn: this.accessTokenExpiresIn,
            })
        },

        clearSession() {
            this.user = null
            this.accessToken = null
            this.tokenType = AUTH_SCHEME.BEARER
            this.accessTokenExpiresIn = null
            clearAccessToken()
            removeStoredSession()
            this.clearPrivateState()
        },

        clearPrivateState() {
            useTripsStore().clear()
            useTripStopsStore().clear()
            useReviewsStore().clear()
            useImagesStore().clear()
            useProvincesStore().clear()
        },

        async register(payload) {
            return this.runAuthRequest(() => authApi.register(payload), true)
        },

        async login(payload) {
            return this.runAuthRequest(() => authApi.login(payload), true)
        },

        async refreshSession() {
            return this.runAuthRequest(
                () => authApi.refreshToken(),
                true,
            )
        },

        async fetchMe() {
            return this.runAuthRequest(async () => {
                const response = await authApi.getMe()
                this.user = response.data
                this.applySession({ ...this.$state, user: response.data })
                return response.data
            })
        },

        async updateProfile(profile) {
            return this.runAuthRequest(async () => {
                const response = await authApi.updateMe(profile)
                this.user = response.data
                this.applySession({ ...this.$state, user: response.data })
                return response.data
            })
        },

        async changePassword(payload) {
            return this.runAuthRequest(() => authApi.changePassword(payload), true)
        },

        async logout() {
            return runStoreRequest(this, async () => {
                try {
                    if (this.accessToken) await authApi.logout()
                } finally {
                    this.clearSession()
                }
            })
        },

        async deleteAccount(password) {
            return this.runAuthRequest(async () => {
                await authApi.deleteAccount(password)
                this.clearSession()
            })
        },

        async runAuthRequest(callback, applyResponseSession = false) {
            return runStoreRequest(this, async () => {
                const response = await callback()

                if (applyResponseSession) {
                    this.applySession(response.data)
                }

                return applyResponseSession ? response.data : response
            })
        },
    },
})
