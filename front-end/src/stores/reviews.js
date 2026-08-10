import { defineStore } from 'pinia'

import { reviewsApi } from '@/api/reviews.js'
import { runStoreRequest } from './request.js'

export const useReviewsStore = defineStore('reviews', {
    state: () => ({
        byTripStopId: {},
        loading: false,
        error: null,
    }),

    getters: {
        forTripStop: (state) => (tripStopId) =>
            state.byTripStopId[String(tripStopId)] ?? null,
    },

    actions: {
        async fetchReview(tripStopId) {
            return runStoreRequest(this, async () => {
                const response = await reviewsApi.getByTripStop(tripStopId)
                this.byTripStopId[String(tripStopId)] = response.data
                return response.data
            })
        },

        async saveReview(tripStopId, payload) {
            return runStoreRequest(this, async () => {
                const response = await reviewsApi.upsert(tripStopId, payload)
                this.byTripStopId[String(tripStopId)] = response.data
                return response.data
            })
        },

        async deleteReview(tripStopId) {
            return runStoreRequest(this, async () => {
                await reviewsApi.remove(tripStopId)
                delete this.byTripStopId[String(tripStopId)]
            })
        },

        clear() {
            this.byTripStopId = {}
            this.error = null
        },
    },
})
