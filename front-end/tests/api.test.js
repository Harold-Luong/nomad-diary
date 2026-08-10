import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
    authApi,
    healthApi,
    provincesApi,
    reviewsApi,
    tripStopsApi,
    tripsApi,
} from '@/api/index.js'
import {
    ApiError,
    buildQuery,
    clearAccessToken,
    clearUnauthorizedHandler,
    getAccessToken,
    setUnauthorizedHandler,
    setAccessToken,
} from '@/services/api.js'

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

beforeEach(() => {
    clearAccessToken()
    clearUnauthorizedHandler()
    vi.stubGlobal('fetch', vi.fn())
})

test('buildQuery omits empty values and preserves supported filters', () => {
    expect(
        buildQuery({ page: 1, pageSize: 20, status: 3, search: '', year: undefined }),
    ).toBe('?page=1&pageSize=20&status=3')
})

test('public auth calls do not send a stale bearer token', async () => {
    setAccessToken('stale-token')
    fetch.mockResolvedValueOnce(
        jsonResponse({ success: true, data: { accessToken: 'new-token' } }),
    )

    await authApi.login({ identifier: 'nomad@example.com', password: 'Password123!' })

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(options.method).toBe('POST')
    expect(options.headers.has('Authorization')).toBe(false)
})

test('private trip calls include bearer token and encoded filters', async () => {
    setAccessToken('access-token')
    fetch.mockResolvedValueOnce(
        jsonResponse({ success: true, data: [], meta: { total: 0 } }),
    )

    await tripsApi.list({ page: 2, pageSize: 10, status: 3 })

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/trips?page=2&pageSize=10&status=3')
    expect(options.headers.get('Authorization')).toBe('Bearer access-token')
})

test('a 401 refreshes the session and retries the original request once', async () => {
    setAccessToken('expired-token')
    const refresh = vi.fn(async () => {
        setAccessToken('fresh-token')
        return 'fresh-token'
    })
    setUnauthorizedHandler(refresh)
    fetch
        .mockResolvedValueOnce(
            jsonResponse({ success: false, error: { code: 'TOKEN_EXPIRED' } }, 401),
        )
        .mockResolvedValueOnce(jsonResponse({ success: true, data: [{ id: '7' }] }))

    const response = await tripsApi.list()

    expect(response.data).toEqual([{ id: '7' }])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer expired-token')
    expect(fetch.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer fresh-token')
    expect(getAccessToken()).toBe('fresh-token')
})

test('concurrent 401 responses share a single refresh request', async () => {
    setAccessToken('expired-token')
    const refresh = vi.fn(async () => {
        await Promise.resolve()
        setAccessToken('fresh-token')
        return 'fresh-token'
    })
    setUnauthorizedHandler(refresh)
    fetch.mockImplementation(async (_url, options) => {
        const token = options.headers.get('Authorization')
        return token === 'Bearer expired-token'
            ? jsonResponse({ success: false, error: { code: 'TOKEN_EXPIRED' } }, 401)
            : jsonResponse({ success: true, data: [] })
    })

    await Promise.all([tripsApi.list({ page: 1 }), tripsApi.list({ page: 2 })])

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(4)
})

test('public authentication requests never trigger session recovery', async () => {
    setAccessToken('expired-token')
    const refresh = vi.fn()
    setUnauthorizedHandler(refresh)
    fetch.mockResolvedValueOnce(
        jsonResponse({ success: false, error: { code: 'INVALID_CREDENTIALS' } }, 401),
    )

    await expect(
        authApi.login({ identifier: 'nomad', password: 'wrong-password' }),
    ).rejects.toMatchObject({ status: 401 })
    expect(refresh).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(1)
})

test('a failed session recovery keeps the original 401 and does not retry', async () => {
    setAccessToken('expired-token')
    const refresh = vi.fn().mockRejectedValue(new Error('Refresh token expired'))
    setUnauthorizedHandler(refresh)
    fetch.mockResolvedValueOnce(
        jsonResponse(
            {
                success: false,
                error: { code: 'ACCESS_TOKEN_EXPIRED', message: 'Access token expired' },
            },
            401,
        ),
    )

    await expect(tripsApi.list()).rejects.toMatchObject({
        code: 'ACCESS_TOKEN_EXPIRED',
        status: 401,
    })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
})

test('trip stop reorder and review functions use backend routes', async () => {
    fetch
        .mockResolvedValueOnce(jsonResponse({ success: true, data: [] }))
        .mockResolvedValueOnce(jsonResponse({ success: true, data: { rating: 5 } }))

    await tripStopsApi.reorder('7', [{ id: '12', visitOrder: 1 }])
    await reviewsApi.upsert('12', { rating: 5 })

    expect(fetch.mock.calls[0][0]).toBe('/api/trips/7/stops/reorder')
    expect(fetch.mock.calls[0][1].method).toBe('PATCH')
    expect(fetch.mock.calls[1][0]).toBe('/api/trip-stops/12/review')
    expect(fetch.mock.calls[1][1].method).toBe('PUT')
})

test('health API calls readiness without authentication', async () => {
    setAccessToken('access-token')
    fetch.mockResolvedValueOnce(
        jsonResponse({ success: true, data: { status: 'ready' } }),
    )

    await healthApi.readiness()

    expect(fetch.mock.calls[0][0]).toBe('/api/health/ready')
    expect(fetch.mock.calls[0][1].headers.has('Authorization')).toBe(false)
})

test('province API uses the implemented backend routes and filters', async () => {
    setAccessToken('access-token')
    fetch
        .mockResolvedValueOnce(jsonResponse({ success: true, data: [], meta: {} }))
        .mockResolvedValueOnce(jsonResponse({ success: true, data: [] }))
        .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: '68' } }))
        .mockResolvedValueOnce(jsonResponse({ success: true, data: [], meta: {} }))

    await provincesApi.list({ countryCode: 'VN', visited: true, page: 2 })
    await provincesApi.listVisited({ countryCode: 'VN' })
    await provincesApi.getById('68')
    await provincesApi.listPlaces('68', { search: 'lake', visited: false })

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
        '/api/provinces?countryCode=VN&visited=true&page=2',
        '/api/provinces/visited?countryCode=VN',
        '/api/provinces/68',
        '/api/provinces/68/places?search=lake&visited=false',
    ])
    expect(
        fetch.mock.calls.every(([, options]) =>
            options.headers.get('Authorization') === 'Bearer access-token'),
    ).toBe(true)
})

test('API errors expose backend code, message, details and status', async () => {
    fetch.mockResolvedValueOnce(
        jsonResponse(
            {
                success: false,
                error: {
                    code: 'TRIP_NOT_FOUND',
                    message: 'Trip not found',
                    details: null,
                },
            },
            404,
        ),
    )

    await expect(tripsApi.getById('999')).rejects.toMatchObject({
        name: 'ApiError',
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
        status: 404,
    })
    await expect(Promise.reject(new ApiError({ code: 'X', message: 'x' }))).rejects.toBeInstanceOf(
        ApiError,
    )
})

describe('API surface', () => {
    test('exports every currently implemented backend operation', () => {
        expect(Object.keys(authApi).sort()).toEqual(
            [
                'changePassword',
                'deleteAccount',
                'getMe',
                'login',
                'logout',
                'refreshToken',
                'register',
                'updateMe',
            ].sort(),
        )
        expect(Object.keys(tripsApi).sort()).toEqual(
            ['create', 'getById', 'list', 'remove', 'update'].sort(),
        )
        expect(Object.keys(provincesApi).sort()).toEqual(
            ['getById', 'list', 'listPlaces', 'listVisited'].sort(),
        )
        expect(Object.keys(tripStopsApi).sort()).toEqual(
            ['create', 'listByTrip', 'remove', 'reorder', 'update'].sort(),
        )
        expect(Object.keys(reviewsApi).sort()).toEqual(
            ['getByTripStop', 'remove', 'upsert'].sort(),
        )
    })
})
