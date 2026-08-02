import { resourceId } from './helpers.js'
import { api } from '@/services/api.js'

export const tripStopsApi = {
    listByTrip: (tripId) =>
        api.get(`/trips/${resourceId(tripId, 'tripId')}/stops`),
    create: (tripId, payload) =>
        api.post(`/trips/${resourceId(tripId, 'tripId')}/stops`, payload),
    reorder: (tripId, stops) =>
        api.patch(`/trips/${resourceId(tripId, 'tripId')}/stops/reorder`, {
            stops,
        }),
    update: (id, payload) =>
        api.patch(`/trip-stops/${resourceId(id, 'tripStopId')}`, payload),
    remove: (id) => api.delete(`/trip-stops/${resourceId(id, 'tripStopId')}`),
}
