import { api, buildQuery } from '@/services/api.js'

export const placesApi = {
    list: (filters) => api.get(`/places${buildQuery(filters)}`),
}
