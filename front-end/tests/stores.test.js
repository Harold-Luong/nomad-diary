import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, test, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth.js'
import { useImagesStore } from '@/stores/images.js'
import { useProvincesStore } from '@/stores/provinces.js'
import { useTripStopsStore } from '@/stores/trip-stops.js'
import { useTripsStore } from '@/stores/trips.js'
import {
    clearAccessToken,
    clearUnauthorizedHandler,
    getAccessToken,
} from '@/services/api.js'

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

beforeEach(() => {
    setActivePinia(createPinia())
    clearAccessToken()
    clearUnauthorizedHandler()
    vi.stubGlobal('fetch', vi.fn())
})

test('auth store applies login session to global HTTP client', async () => {
    fetch.mockResolvedValueOnce(
        jsonResponse({
            success: true,
            data: {
                user: { id: '2', username: 'nomad' },
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                tokenType: 'Bearer',
                accessTokenExpiresIn: '15m',
                refreshTokenExpiresIn: '30d',
            },
        }),
    )

    const store = useAuthStore()
    await store.login({ identifier: 'nomad', password: 'Password123!' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.user.username).toBe('nomad')
    expect(getAccessToken()).toBe('access-token')
})

test('trips store keeps list data and pagination metadata', async () => {
    fetch.mockResolvedValueOnce(
        jsonResponse({
            success: true,
            data: [{ id: '7', title: 'Đà Lạt' }],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        }),
    )

    const store = useTripsStore()
    await store.fetchTrips({ page: 1, pageSize: 20 })

    expect(store.items).toHaveLength(1)
    expect(store.meta.total).toBe(1)
})

test('trip stops store keeps stops sorted by visitOrder', async () => {
    fetch.mockResolvedValueOnce(
        jsonResponse({
            success: true,
            data: [
                { id: '2', tripId: '7', visitOrder: 2 },
                { id: '1', tripId: '7', visitOrder: 1 },
            ],
        }),
    )

    const store = useTripStopsStore()
    await store.fetchForTrip('7')

    expect(store.forTrip('7').map((stop) => stop.id)).toEqual(['1', '2'])
})

test('provinces store keeps tracking data and pagination metadata', async () => {
    fetch
        .mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: [{ id: '68', name: 'Lâm Đồng', visited: true, visitCount: 3 }],
                meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
            }),
        )
        .mockResolvedValueOnce(
            jsonResponse({
                success: true,
                data: [{ id: '10', name: 'Hồ Xuân Hương', provinceId: '68' }],
                meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
            }),
        )

    const store = useProvincesStore()
    await store.fetchProvinces({ countryCode: 'VN', pageSize: 12 })
    await store.fetchPlaces('68', { pageSize: 12 })

    expect(store.items[0].name).toBe('Lâm Đồng')
    expect(store.meta.total).toBe(1)
    expect(store.places[0].provinceId).toBe('68')
    expect(store.placesMeta.totalPages).toBe(1)
})

test('clearing auth session also clears private domain state', () => {
    const authStore = useAuthStore()
    const tripsStore = useTripsStore()
    const stopsStore = useTripStopsStore()
    const provincesStore = useProvincesStore()
    const imagesStore = useImagesStore()

    authStore.applySession({
        user: { id: '2', username: 'nomad' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    })
    tripsStore.items = [{ id: '7' }]
    stopsStore.byTripId = { 7: [{ id: '1' }] }
    provincesStore.items = [{ id: '68' }]
    imagesStore.items = [{ id: '9', tripId: '7' }]

    authStore.clearSession()

    expect(tripsStore.items).toEqual([])
    expect(stopsStore.byTripId).toEqual({})
    expect(provincesStore.items).toEqual([])
    expect(imagesStore.items).toEqual([])
    expect(authStore.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBe(null)
})
