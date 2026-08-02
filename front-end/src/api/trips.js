import { resourceId } from './helpers.js'
import { api, buildQuery } from '@/services/api.js'

export const tripsApi = {
    list: (filters = {}) => api.get(`/trips${buildQuery(filters)}`),
    getById: (id) => api.get(`/trips/${resourceId(id, 'tripId')}`),
    create: (payload) => api.post('/trips', payload),
    update: (id, payload) =>
        api.patch(`/trips/${resourceId(id, 'tripId')}`, payload),
    remove: (id) => api.delete(`/trips/${resourceId(id, 'tripId')}`),
}
