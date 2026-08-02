import { defineStore } from 'pinia'

import { tripStopsApi } from '@/api/trip-stops.js'
import { runStoreRequest } from './request.js'

function sortStops(stops) {
    return [...stops].sort(
        (left, right) =>
            left.visitOrder - right.visitOrder ||
            String(left.id).localeCompare(String(right.id)),
    )
}

export const useTripStopsStore = defineStore('tripStops', {
    state: () => ({
        byTripId: {},
        loading: false,
        error: null,
    }),

    getters: {
        forTrip: (state) => (tripId) => state.byTripId[String(tripId)] ?? [],
    },

    actions: {
        async fetchForTrip(tripId) {
            return runStoreRequest(this, async () => {
                const response = await tripStopsApi.listByTrip(tripId)
                this.byTripId[String(tripId)] = sortStops(response.data)
                return this.byTripId[String(tripId)]
            })
        },

        async createStop(tripId, payload) {
            return runStoreRequest(this, async () => {
                const response = await tripStopsApi.create(tripId, payload)
                const key = String(tripId)
                this.byTripId[key] = sortStops([...(this.byTripId[key] ?? []), response.data])
                return response.data
            })
        },

        async updateStop(id, payload) {
            return runStoreRequest(this, async () => {
                const response = await tripStopsApi.update(id, payload)
                this.replaceStop(response.data)
                return response.data
            })
        },

        async deleteStop(id) {
            return runStoreRequest(this, async () => {
                await tripStopsApi.remove(id)
                Object.keys(this.byTripId).forEach((tripId) => {
                    this.byTripId[tripId] = this.byTripId[tripId].filter(
                        (stop) => String(stop.id) !== String(id),
                    )
                })
            })
        },

        async reorderStops(tripId, stops) {
            return runStoreRequest(this, async () => {
                const response = await tripStopsApi.reorder(tripId, stops)
                this.byTripId[String(tripId)] = sortStops(response.data)
                return this.byTripId[String(tripId)]
            })
        },

        replaceStop(stop) {
            Object.keys(this.byTripId).forEach((tripId) => {
                const index = this.byTripId[tripId].findIndex(
                    (item) => String(item.id) === String(stop.id),
                )
                if (index >= 0) {
                    this.byTripId[tripId][index] = stop
                    this.byTripId[tripId] = sortStops(this.byTripId[tripId])
                }
            })
        },

        clear() {
            this.byTripId = {}
            this.error = null
        },
    },
})
