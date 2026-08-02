import { resourceId } from './helpers.js'
import { api } from '@/services/api.js'

const reviewPath = (tripStopId) =>
    `/trip-stops/${resourceId(tripStopId, 'tripStopId')}/review`

export const reviewsApi = {
    getByTripStop: (tripStopId) => api.get(reviewPath(tripStopId)),
    upsert: (tripStopId, payload) => api.put(reviewPath(tripStopId), payload),
    remove: (tripStopId) => api.delete(reviewPath(tripStopId)),
}
