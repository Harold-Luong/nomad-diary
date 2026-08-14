import { beforeEach, describe, expect, test, vi } from 'vitest'
import axios from 'axios'

vi.mock('axios', () => ({
    default: {
        request: vi.fn(),
        isCancel: vi.fn(() => false),
    },
}))

import {
    authApi,
    healthApi,
    imagesApi,
    locationCatalogApi,
    placesApi,
    provincesApi,
    reviewsApi,
    tripStopsApi,
    tripsApi,
    uploadsApi,
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
    axios.request.mockReset()
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
    expect(url).toBe('http://localhost:3000/auth/login')
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
    expect(url).toBe('http://localhost:3000/trips?page=2&pageSize=10&status=3')
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

    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3000/trips/7/stops/reorder')
    expect(fetch.mock.calls[0][1].method).toBe('PATCH')
    expect(fetch.mock.calls[1][0]).toBe('http://localhost:3000/trip-stops/12/review')
    expect(fetch.mock.calls[1][1].method).toBe('PUT')
})

test('health API calls readiness without authentication', async () => {
    setAccessToken('access-token')
    fetch.mockResolvedValueOnce(
        jsonResponse({ success: true, data: { status: 'ready' } }),
    )

    await healthApi.readiness()

    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3000/health/ready')
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
        'http://localhost:3000/provinces?countryCode=VN&visited=true&page=2',
        'http://localhost:3000/provinces/visited?countryCode=VN',
        'http://localhost:3000/provinces/68',
        'http://localhost:3000/provinces/68/places?search=lake&visited=false',
    ])
    expect(
        fetch.mock.calls.every(([, options]) =>
            options.headers.get('Authorization') === 'Bearer access-token'),
    ).toBe(true)
})

test('places API loads only the current user history for a province and ward', async () => {
    setAccessToken('access-token')
    fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: [], meta: {} }))

    await placesApi.list({
        provinceCode: '70',
        wardCode: '25180',
        wardName: 'Phường Bình Minh',
        pageSize: 100,
    })

    expect(fetch.mock.calls[0][0]).toBe(
        'http://localhost:3000/places?provinceCode=70&wardCode=25180&wardName=Ph%C6%B0%E1%BB%9Dng+B%C3%ACnh+Minh&pageSize=100',
    )
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer access-token')
})

test('location catalog loads dependent public options without bearer auth', async () => {
    setAccessToken('access-token')
    fetch
        .mockResolvedValueOnce(jsonResponse({ data: [{ code: '48', name: 'Đà Nẵng' }] }))
        .mockResolvedValueOnce(jsonResponse({ data: [{ code: '20242', name: 'Hải Châu' }] }))
        .mockResolvedValueOnce(jsonResponse({
            data: [{ placeId: 'place-1', name: 'Cầu Rồng' }],
            meta: { nextCursor: 'next-cursor' },
        }))
        .mockResolvedValueOnce(jsonResponse({
            data: [{ placeId: 'place-2', name: 'Chợ Hàn' }],
            meta: { nextCursor: null },
        }))

    await expect(locationCatalogApi.listProvinces()).resolves.toEqual([
        { code: '48', name: 'Đà Nẵng' },
    ])
    await expect(locationCatalogApi.listWards('48')).resolves.toEqual([
        { code: '20242', name: 'Hải Châu' },
    ])
    await expect(locationCatalogApi.listPlaces('48', '20242')).resolves.toEqual([
        { placeId: 'place-1', name: 'Cầu Rồng' },
        { placeId: 'place-2', name: 'Chợ Hàn' },
    ])

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
        'https://locations-api.nomad-diary.site/v1/provinces',
        'https://locations-api.nomad-diary.site/v1/provinces/48/wards',
        'https://locations-api.nomad-diary.site/v1/provinces/48/wards/20242/places?limit=50',
        'https://locations-api.nomad-diary.site/v1/provinces/48/wards/20242/places?limit=50&cursor=next-cursor',
    ])
    expect(
        fetch.mock.calls.every(([, options]) => !new Headers(options.headers).has('Authorization')),
    ).toBe(true)
})

test('image upload gets a PUT URL and reports direct-to-storage progress', async () => {
    setAccessToken('access-token')
    const file = {
        name: 'da-lat.webp',
        type: 'image/webp',
        size: 2048,
    }
    const objectKey = 'users/3/trip-cover/2bb95131-6918-4d70-813a-33f916edb781.webp'

    fetch.mockResolvedValueOnce(
        jsonResponse({
            success: true,
            data: {
                uploadUrl: 'https://s3.example/upload',
                objectKey,
                method: 'PUT',
                headers: { 'Content-Type': 'image/webp' },
            },
        }, 201),
    )
    axios.request.mockImplementationOnce(async (options) => {
        options.onUploadProgress({ loaded: 1024, total: 2048 })
        options.onUploadProgress({ loaded: 2048, total: 2048 })
        return { status: 200 }
    })
    const onProgress = vi.fn()

    await expect(uploadsApi.uploadImage(file, 'trip-cover', { onProgress })).resolves.toEqual({
        objectKey,
    })

    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3000/uploads/presigned-url')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
        fileName: 'da-lat.webp',
        contentType: 'image/webp',
        fileSize: 2048,
        purpose: 'trip-cover',
    })
    expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({
            url: 'https://s3.example/upload',
            method: 'PUT',
            headers: { 'Content-Type': 'image/webp' },
            data: file,
        }),
    )
    expect(onProgress.mock.calls.map(([value]) => value)).toEqual([0, 50, 100, 100])
    expect(fetch).toHaveBeenCalledTimes(1)
})

test('image upload rejects unsupported files before calling the backend', async () => {
    await expect(
        uploadsApi.uploadImage(
            { name: 'vector.svg', type: 'image/svg+xml', size: 100 },
            'avatar',
        ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_IMAGE', status: 422 })
    expect(fetch).not.toHaveBeenCalled()
})

test('images API maps list, create, update and delete to backend routes', async () => {
    setAccessToken('access-token')
    fetch
        .mockResolvedValueOnce(jsonResponse({ success: true, data: [], meta: { total: 0 } }))
        .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: '9' } }, 201))
        .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: '9', isFavorite: true } }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await imagesApi.list({ tripId: '7', tripStopId: '12', page: 2 })
    await imagesApi.create({
        tripId: '7',
        tripStopId: '12',
        imageObjectKey: 'users/3/images/2bb95131-6918-4d70-813a-33f916edb781.webp',
    })
    await imagesApi.update('9', { isFavorite: true })
    await imagesApi.remove('9')

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
        'http://localhost:3000/images?tripId=7&tripStopId=12&page=2',
        'http://localhost:3000/images',
        'http://localhost:3000/images/9',
        'http://localhost:3000/images/9',
    ])
    expect(fetch.mock.calls.map(([, options]) => options.method)).toEqual([
        'GET',
        'POST',
        'PATCH',
        'DELETE',
    ])
})

test('image upload rejects files larger than 10 MB before calling the backend', async () => {
    await expect(
        uploadsApi.uploadImage(
            {
                name: 'large-photo.jpg',
                type: 'image/jpeg',
                size: (10 * 1024 * 1024) + 1,
            },
            'avatar',
        ),
    ).rejects.toMatchObject({
        code: 'IMAGE_TOO_LARGE',
        message: 'Ảnh không được vượt quá 10 MB',
        status: 422,
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(axios.request).not.toHaveBeenCalled()
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
        expect(Object.keys(uploadsApi).sort()).toEqual(
            ['createPresignedUpload', 'uploadImage'].sort(),
        )
        expect(Object.keys(imagesApi).sort()).toEqual(
            ['create', 'getById', 'list', 'remove', 'update'].sort(),
        )
        expect(Object.keys(locationCatalogApi).sort()).toEqual(
            ['listPlaces', 'listProvinces', 'listWards'].sort(),
        )
        expect(Object.keys(provincesApi).sort()).toEqual(
            ['getById', 'list', 'listPlaces', 'listVisited'].sort(),
        )
        expect(Object.keys(placesApi)).toEqual(['list'])
        expect(Object.keys(tripStopsApi).sort()).toEqual(
            ['create', 'listByTrip', 'remove', 'reorder', 'update'].sort(),
        )
        expect(Object.keys(reviewsApi).sort()).toEqual(
            ['getByTripStop', 'remove', 'upsert'].sort(),
        )
    })
})
