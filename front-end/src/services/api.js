import { AUTH_SCHEME, CLIENT_ERROR_CODE } from '@/constants/app.js'

const DEFAULT_API_BASE_URL = import.meta.env.PROD
    ? 'https://api.nomad-diary.site'
    : 'http://localhost:3000'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)
    .replace(/\/$/, '')

let defaultAccessToken = null
let unauthorizedHandler = null
let sessionRecoveryPromise = null

export class ApiError extends Error {
    constructor({ code, message, details = null, status = 500, cause }) {
        super(message, cause ? { cause } : undefined)
        this.name = 'ApiError'
        this.code = code
        this.details = details
        this.status = status
    }
}

export function setAccessToken(token) {
    defaultAccessToken = typeof token === 'string' && token.length > 0 ? token : null
}

export function clearAccessToken() {
    defaultAccessToken = null
}

export function getAccessToken() {
    return defaultAccessToken
}

export function setUnauthorizedHandler(handler) {
    unauthorizedHandler = typeof handler === 'function' ? handler : null
}

export function clearUnauthorizedHandler() {
    unauthorizedHandler = null
    sessionRecoveryPromise = null
}

function recoverSession() {
    if (!unauthorizedHandler) return null

    if (!sessionRecoveryPromise) {
        sessionRecoveryPromise = Promise.resolve()
            .then(() => unauthorizedHandler())
            .finally(() => {
                sessionRecoveryPromise = null
            })
    }

    return sessionRecoveryPromise
}

export function buildQuery(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return

        if (Array.isArray(value)) {
            value.forEach((item) => query.append(key, String(item)))
            return
        }

        query.set(key, String(value))
    })

    const value = query.toString()
    return value ? `?${value}` : ''
}

async function request(path, options = {}) {
    const {
        token = defaultAccessToken,
        body,
        headers: customHeaders,
        retryOnUnauthorized = true,
        ...fetchOptions
    } = options
    const headers = new Headers(customHeaders)

    headers.set('Accept', 'application/json')

    if (body !== undefined) {
        headers.set('Content-Type', 'application/json')
    }

    if (token) {
        headers.set('Authorization', `${AUTH_SCHEME.BEARER} ${token}`)
    }

    let response

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...fetchOptions,
            credentials: 'include',
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        })
    } catch (error) {
        throw new ApiError({
            code: CLIENT_ERROR_CODE.NETWORK,
            message: 'Unable to connect to the API',
            details: null,
            status: 0,
            cause: error,
        })
    }

    if (response.status === 204) {
        return null
    }

    const payload = await response.json().catch(() => null)
    if (response.ok) return payload

    const responseError = new ApiError({
        code: payload?.error?.code || CLIENT_ERROR_CODE.HTTP,
        message: payload?.error?.message || `Request failed with status ${response.status}`,
        details: payload?.error?.details ?? null,
        status: response.status,
    })

    if (
        response.status === 401 &&
        token &&
        retryOnUnauthorized &&
        unauthorizedHandler
    ) {
        let refreshedToken

        try {
            refreshedToken = (await recoverSession()) || defaultAccessToken
        } catch {
            throw responseError
        }

        if (refreshedToken) {
            return request(path, {
                ...options,
                token: refreshedToken,
                retryOnUnauthorized: false,
            })
        }
    }

    throw responseError
}

export const api = {
    request,
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
