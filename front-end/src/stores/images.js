import { defineStore } from 'pinia'

import { imagesApi } from '@/api/images.js'
import { PAGINATION } from '@/constants/app.js'
import { runStoreRequest } from './request.js'

const emptyMeta = () => ({
    page: PAGINATION.DEFAULT_PAGE,
    pageSize: 24,
    total: 0,
    totalPages: 0,
})

export const useImagesStore = defineStore('images', {
    state: () => ({
        items: [],
        meta: emptyMeta(),
        filters: {},
        loading: false,
        error: null,
    }),

    actions: {
        async fetchImages(filters = this.filters) {
            this.filters = { ...filters }
            return runStoreRequest(this, async () => {
                const response = await imagesApi.list(filters)
                this.items = response.data
                this.meta = response.meta ?? emptyMeta()
                return this.items
            })
        },

        async createImage(payload) {
            return runStoreRequest(this, async () => {
                const response = await imagesApi.create(payload)
                this.items = [response.data, ...this.items]
                this.meta.total += 1
                return response.data
            })
        },

        async updateImage(id, payload) {
            return runStoreRequest(this, async () => {
                const response = await imagesApi.update(id, payload)
                const index = this.items.findIndex(
                    (image) => String(image.id) === String(id),
                )
                if (index >= 0) this.items[index] = response.data
                return response.data
            })
        },

        async deleteImage(id) {
            return runStoreRequest(this, async () => {
                await imagesApi.remove(id)
                this.items = this.items.filter(
                    (image) => String(image.id) !== String(id),
                )
                this.meta.total = Math.max(0, this.meta.total - 1)
            })
        },

        clear() {
            this.items = []
            this.meta = emptyMeta()
            this.filters = {}
            this.error = null
        },
    },
})
