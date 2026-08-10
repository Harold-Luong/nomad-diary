const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function asDate(value) {
    if (value instanceof Date) return value
    if (DATE_ONLY_PATTERN.test(String(value))) return new Date(`${value}T00:00:00.000Z`)
    return new Date(value)
}

export function isValidDate(value) {
    if (!value) return false
    const date = asDate(value)
    if (Number.isNaN(date.getTime())) return false
    if (DATE_ONLY_PATTERN.test(String(value))) {
        return date.toISOString().slice(0, 10) === String(value)
    }
    return true
}

export function formatDate(value, options = {}) {
    if (!isValidDate(value)) return options.fallback ?? '—'

    return new Intl.DateTimeFormat(options.locale || 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: DATE_ONLY_PATTERN.test(String(value)) ? 'UTC' : options.timeZone,
        ...options.format,
    }).format(asDate(value))
}

export function formatDateTime(value, options = {}) {
    if (!isValidDate(value)) return options.fallback ?? '—'

    return new Intl.DateTimeFormat(options.locale || 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options.format,
    }).format(asDate(value))
}

export function toDateInputValue(value) {
    if (!value) return ''
    if (DATE_ONLY_PATTERN.test(String(value))) return String(value)
    if (!isValidDate(value)) return ''
    return asDate(value).toISOString().slice(0, 10)
}
