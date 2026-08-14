import { CLIENT_ERROR_CODE } from '@/constants/app.js'
import { ApiError, buildQuery } from '@/services/api.js'

const DEFAULT_LOCATION_CATALOG_BASE_URL = 'https://locations-api.nomad-diary.site'
const LOCATION_CATALOG_BASE_URL = (
    import.meta.env.VITE_LOCATION_CATALOG_BASE_URL || DEFAULT_LOCATION_CATALOG_BASE_URL
).replace(/\/$/, '')

async function get(path) {
    let response

    try {
        response = await fetch(`${LOCATION_CATALOG_BASE_URL}${path}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        })
    } catch (error) {
        throw new ApiError({
            code: CLIENT_ERROR_CODE.NETWORK,
            message: 'Không thể kết nối đến Location Catalog',
            status: 0,
            cause: error,
        })
    }

    const payload = await response.json().catch(() => null)
    if (response.ok) return payload

    throw new ApiError({
        code: payload?.error?.code || CLIENT_ERROR_CODE.HTTP,
        message: payload?.error?.message || `Location Catalog trả về HTTP ${response.status}`,
        status: response.status,
    })
}

async function listAllPlaces(provinceCode, wardCode) {
    const items = []
    const seenCursors = new Set()
    let cursor

    do {
        const response = await get(
            `/v1/provinces/${encodeURIComponent(provinceCode)}`
            + `/wards/${encodeURIComponent(wardCode)}/places`
            + buildQuery({ limit: 50, cursor }),
        )

        items.push(...(response.data || []))
        cursor = response.meta?.nextCursor || null

        if (cursor && seenCursors.has(cursor)) {
            throw new ApiError({
                code: CLIENT_ERROR_CODE.UNEXPECTED,
                message: 'Location Catalog trả về cursor không hợp lệ',
            })
        }

        if (cursor) seenCursors.add(cursor)
    } while (cursor)

    return items
}

export const locationCatalogApi = {
    listProvinces: async () => (await get('/v1/provinces')).data || [],
    listWards: async (provinceCode) => (
        await get(`/v1/provinces/${encodeURIComponent(provinceCode)}/wards`)
    ).data || [],
    listPlaces: listAllPlaces,
}
