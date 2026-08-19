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
    UNSUPPORTED_IMAGE: 'UNSUPPORTED_IMAGE',
    EMPTY_IMAGE: 'EMPTY_IMAGE',
    IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
    IMAGE_UPLOAD_FAILED: 'IMAGE_UPLOAD_FAILED',
})

export const UPLOAD_PURPOSE = Object.freeze({
    AVATAR: 'avatar',
    TRIP_COVER: 'trip-cover',
    IMAGES: 'images',
})

export const IMAGE_CONTENT_TYPES = Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
])

export const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024

export const EDITOR_MODE = Object.freeze({
    CREATE: 'create',
    EDIT: 'edit',
})
