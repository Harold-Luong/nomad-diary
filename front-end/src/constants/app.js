export const STORAGE_KEY = Object.freeze({
    AUTH_SESSION: 'nomad-diary.auth-session',
})

export const AUTH_SCHEME = Object.freeze({
    BEARER: 'Bearer',
})

export const PAGINATION = Object.freeze({
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
})

export const CLIENT_ERROR_CODE = Object.freeze({
    NETWORK: 'NETWORK_ERROR',
    HTTP: 'HTTP_ERROR',
    UNEXPECTED: 'UNEXPECTED_ERROR',
    MISSING_REFRESH_TOKEN: 'MISSING_REFRESH_TOKEN',
})

export const EDITOR_MODE = Object.freeze({
    CREATE: 'create',
    EDIT: 'edit',
})
