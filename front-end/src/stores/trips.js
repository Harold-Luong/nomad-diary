import { defineStore } from 'pinia'

import { tripsApi } from '@/api/trips.js'
import { PAGINATION } from '@/constants/app.js'
import { runStoreRequest } from './request.js'

const emptyMeta = () => ({
    page: PAGINATION.DEFAULT_PAGE,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
})

export const useTripsStore = defineStore('trips', {
    state: () => ({
        items: [],
        current: null,
        meta: emptyMeta(),
        filters: {},
        loading: false,
        error: null,
    }),

    actions: {
        async fetchTrips(filters = this.filters) {
            this.filters = { ...filters }

            return runStoreRequest(this, async () => {
                const response = await tripsApi.list(filters)
                this.items = response.data
                this.meta = response.meta ?? emptyMeta()
                return this.items
            })
        },

        async fetchTrip(id) {
            return runStoreRequest(this, async () => {
                const response = await tripsApi.getById(id)
                this.current = response.data
                this.replaceItem(response.data)
                return response.data
            })
        },

        async createTrip(payload) {
            return runStoreRequest(this, async () => {
                const response = await tripsApi.create(payload)
                this.items = [response.data, ...this.items]
                this.meta.total += 1
                this.current = response.data
                return response.data
            })
        },

        async updateTrip(id, payload) {
            return runStoreRequest(this, async () => {
                const response = await tripsApi.update(id, payload)
                this.replaceItem(response.data)
                this.current = response.data
                return response.data
            })
        },

        async deleteTrip(id) {
            return runStoreRequest(this, async () => {
                await tripsApi.remove(id)
                this.items = this.items.filter((trip) => String(trip.id) !== String(id))
                this.meta.total = Math.max(0, this.meta.total - 1)
                if (String(this.current?.id) === String(id)) this.current = null
            })
        },

        replaceItem(trip) {
            const index = this.items.findIndex((item) => String(item.id) === String(trip.id))
            if (index >= 0) this.items[index] = trip
        },

        clear() {
            this.items = []
            this.current = null
            this.meta = emptyMeta()
            this.filters = {}
            this.error = null
        },
    },
})
