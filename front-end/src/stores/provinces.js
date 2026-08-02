import { defineStore } from 'pinia'

import { provincesApi } from '@/api/provinces.js'
import { PAGINATION } from '@/constants/app.js'
import { runStoreRequest } from './request.js'

const emptyMeta = () => ({
    page: PAGINATION.DEFAULT_PAGE,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
})

export const useProvincesStore = defineStore('provinces', {
    state: () => ({
        items: [],
        visited: [],
        current: null,
        places: [],
        meta: emptyMeta(),
        placesMeta: emptyMeta(),
        loading: false,
        error: null,
    }),

    actions: {
        async fetchProvinces(filters = {}) {
            return runStoreRequest(this, async () => {
                const response = await provincesApi.list(filters)
                this.items = response.data
                this.meta = response.meta ?? emptyMeta()
                return this.items
            })
        },

        async fetchVisited(filters = {}) {
            return runStoreRequest(this, async () => {
                const response = await provincesApi.listVisited(filters)
                this.visited = response.data
                return this.visited
            })
        },

        async fetchProvince(id) {
            return runStoreRequest(this, async () => {
                const response = await provincesApi.getById(id)
                this.current = response.data
                return this.current
            })
        },

        async fetchPlaces(id, filters = {}) {
            return runStoreRequest(this, async () => {
                const response = await provincesApi.listPlaces(id, filters)
                this.places = response.data
                this.placesMeta = response.meta ?? emptyMeta()
                return this.places
            })
        },

        clearPlaces() {
            this.places = []
            this.placesMeta = emptyMeta()
        },

        clear() {
            this.items = []
            this.visited = []
            this.current = null
            this.clearPlaces()
            this.meta = emptyMeta()
            this.error = null
        },
    },
})
