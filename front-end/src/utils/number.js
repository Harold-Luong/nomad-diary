export function formatNumber(value, options = {}) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return options.fallback ?? '—'
    return new Intl.NumberFormat(options.locale || 'vi-VN', options.format).format(numericValue)
}

export function toInteger(value, fallback = null) {
    if (value === '' || value === null || value === undefined) return fallback
    const parsed = Number(value)
    return Number.isInteger(parsed) ? parsed : fallback
}

export function clamp(value, minimum, maximum) {
    return Math.min(Math.max(Number(value), minimum), maximum)
}
