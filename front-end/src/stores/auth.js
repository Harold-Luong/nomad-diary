import { defineStore } from 'pinia'

import { authApi } from '@/api/auth.js'
import { AUTH_SCHEME } from '@/constants/app.js'
import { clearAccessToken, setAccessToken } from '@/services/api.js'
import { runStoreRequest } from './request.js'
import { useReviewsStore } from './reviews.js'
import { useImagesStore } from './images.js'
import { useProvincesStore } from './provinces.js'
import { useTripsStore } from './trips.js'
import { useTripStopsStore } from './trip-stops.js'

const LEGACY_AUTH_STORAGE_KEY = 'nomad-diary.auth-session'

function removeLegacyStoredSession() {
    if (typeof window === 'undefined') return

    for (const storage of [window.localStorage, window.sessionStorage]) {
        try {
            storage?.removeItem(LEGACY_AUTH_STORAGE_KEY)
        } catch {
            // Storage can be unavailable under restrictive browser policies.
        }
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
        sessionPublisher: null,
    }),

    getters: {
        isAuthenticated: (state) => Boolean(state.accessToken && state.user),
    },

    actions: {
        async initialize({ requestPeerSession, withRefreshLock } = {}) {
            removeLegacyStoredSession()
            clearAccessToken()

            try {
                const restoreSession = async () => {
                    await requestPeerSession?.()
                    if (!this.isAuthenticated) await this.refreshSession()
                }

                if (withRefreshLock) {
                    await withRefreshLock(restoreSession)
                } else {
                    await restoreSession()
                }
            } catch {
                this.clearSession()
            }

            this.initialized = true
        },

        configureSessionPublisher(publisher) {
            this.sessionPublisher = typeof publisher === 'function' ? publisher : null
        },

        getSessionSnapshot() {
            if (!this.isAuthenticated) return null

            return {
                user: this.user,
                accessToken: this.accessToken,
                tokenType: this.tokenType,
                accessTokenExpiresIn: this.accessTokenExpiresIn,
            }
        },

        applySession(session, { broadcast = true } = {}) {
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
            if (broadcast) this.sessionPublisher?.('session', this.getSessionSnapshot())
        },

        clearSession({ broadcast = true } = {}) {
            this.user = null
            this.accessToken = null
            this.tokenType = AUTH_SCHEME.BEARER
            this.accessTokenExpiresIn = null
            clearAccessToken()
            this.clearPrivateState()
            if (broadcast) this.sessionPublisher?.('clear')
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
