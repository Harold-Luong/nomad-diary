export function resourceId(value, fieldName = 'id') {
    if (value === undefined || value === null || value === '') {
        throw new TypeError(`${fieldName} is required`)
    }

    return encodeURIComponent(String(value))
}
