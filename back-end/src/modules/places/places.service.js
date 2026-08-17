import { paginationMeta } from "../../shared/pagination/pagination.js";
import * as placesRepository from "./places.repository.js";

function toPlaceDto(place) {
    return {
        id: place.id,
        name: place.name,
        slug: place.slug,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        catalogPlaceId: place.catalog_place_id,
        provinceCode: place.province_code,
        provinceName: place.province_name,
        wardCode: place.ward_code,
        wardName: place.ward_name,
    };
}

export async function listPlaces(userId, filters, pagination) {
    const { rows, total } = await placesRepository.listVisitedForUser({
        userId,
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
    });

    return {
        data: rows.map(toPlaceDto),
        meta: paginationMeta({ ...pagination, total }),
    };
}
