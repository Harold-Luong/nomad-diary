export function normalizePlaceName(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
}

export function mergePlaceOptions(catalogPlaces = [], backendPlaces = []) {
    const options = []
    const backendByCatalogId = new Map()

    backendPlaces.forEach((place) => {
        if (!normalizePlaceName(place.name)) return

        const option = {
            key: `backend:${place.id}`,
            name: place.name,
            backendPlaceId: String(place.id),
            catalogPlaceId: place.catalogPlaceId ? String(place.catalogPlaceId) : null,
            address: place.address ?? null,
            latitude: place.latitude ?? null,
            longitude: place.longitude ?? null,
        }
        options.push(option)

        if (option.catalogPlaceId) {
            backendByCatalogId.set(option.catalogPlaceId, option)
        }
    })

    catalogPlaces.forEach((place) => {
        if (!normalizePlaceName(place.name)) return

        const catalogPlaceId = String(place.placeId)
        const existing = backendByCatalogId.get(catalogPlaceId)
        if (existing) {
            existing.address ??= place.address ?? null
            existing.latitude ??= place.latitude ?? null
            existing.longitude ??= place.longitude ?? null
            return
        }

        options.push({
            key: `catalog:${place.placeId}`,
            name: place.name,
            backendPlaceId: null,
            catalogPlaceId,
            address: place.address ?? null,
            latitude: place.latitude ?? null,
            longitude: place.longitude ?? null,
        })
    })

    return addPlaceSelectionValues(options)
}

export function addPlaceSelectionValues(options = []) {
    const nameCounts = new Map()
    const baseValueCounts = new Map()

    options.forEach((place) => {
        const normalizedName = normalizePlaceName(place.name)
        nameCounts.set(normalizedName, (nameCounts.get(normalizedName) ?? 0) + 1)
    })

    const withBaseValues = options.map((place) => {
        const duplicateName = nameCounts.get(normalizePlaceName(place.name)) > 1
        const detail = String(place.address ?? '').trim().slice(0, 120)
        const baseSelectionValue = duplicateName && detail
            ? `${place.name} — ${detail}`
            : place.name

        baseValueCounts.set(
            baseSelectionValue,
            (baseValueCounts.get(baseSelectionValue) ?? 0) + 1,
        )

        return { ...place, selectionValue: baseSelectionValue }
    })

    return withBaseValues.map((place) => {
        if (baseValueCounts.get(place.selectionValue) === 1) return place

        const sourceId = place.catalogPlaceId
            ? `catalog ${place.catalogPlaceId}`
            : `đã lưu #${place.backendPlaceId}`
        return {
            ...place,
            selectionValue: `${place.selectionValue} (${sourceId})`,
        }
    })
}
