import { resourceId } from './helpers.js'
import { api, buildQuery } from '@/services/api.js'

export const imagesApi = {
    list: (filters = {}) => api.get(`/images${buildQuery(filters)}`),
    getById: (id) => api.get(`/images/${resourceId(id, 'imageId')}`),
    create: (payload) => api.post('/images', payload),
    update: (id, payload) =>
        api.patch(`/images/${resourceId(id, 'imageId')}`, payload),
    remove: (id) => api.delete(`/images/${resourceId(id, 'imageId')}`),
}
