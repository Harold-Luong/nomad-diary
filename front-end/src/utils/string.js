export function blankToNull(value) {
  return typeof value === 'string' && value.trim() === '' ? null : value
}

export function emptyToNull(value) {
    if (typeof value !== 'string') return value ?? null
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
}

export function slugify(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/đ/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export function truncate(value, maximumLength, suffix = '…') {
    const text = String(value ?? '')
    if (text.length <= maximumLength) return text
    if (maximumLength <= suffix.length) return suffix.slice(0, Math.max(0, maximumLength))
    return `${text.slice(0, Math.max(0, maximumLength - suffix.length))}${suffix}`
}
