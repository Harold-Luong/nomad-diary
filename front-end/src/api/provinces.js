import { resourceId } from './helpers.js'
import { api, buildQuery } from '@/services/api.js'

export const provincesApi = {
    list: (filters = {}) => api.get(`/provinces${buildQuery(filters)}`),
    listVisited: (filters = {}) =>
        api.get(`/provinces/visited${buildQuery(filters)}`),
    getById: (id) => api.get(`/provinces/${resourceId(id, 'provinceId')}`),
    listPlaces: (id, filters = {}) =>
        api.get(
            `/provinces/${resourceId(id, 'provinceId')}/places${buildQuery(filters)}`,
        ),
}
