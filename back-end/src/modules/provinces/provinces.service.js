import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import { paginationMeta } from "../../shared/pagination/pagination.js";
import * as provincesRepository from "./provinces.repository.js";

function toProvinceDto(province) {
    const visitCount = Number(province.visit_count ?? 0);

    return {
        id: province.id,
        countryCode: province.country_code,
        code: province.code,
        name: province.name,
        slug: province.slug,
        centerLatitude: province.center_latitude,
        centerLongitude: province.center_longitude,
        visited: visitCount > 0,
        tripCount: Number(province.trip_count ?? 0),
        placeCount: Number(province.place_count ?? 0),
        visitCount,
        firstVisitedAt: province.first_visited_at,
        lastVisitedAt: province.last_visited_at,
    };
}

function toPlaceDto(place) {
    const visitCount = Number(place.visit_count ?? 0);

    return {
        id: place.id,
        provinceId: place.province_id,
        name: place.name,
        slug: place.slug,
        description: place.description,
        district: place.district,
        ward: place.ward,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        websiteUrl: place.website_url,
        mapUrl: place.map_url,
        visited: visitCount > 0,
        tripCount: Number(place.trip_count ?? 0),
        visitCount,
        firstVisitedAt: place.first_visited_at,
        lastVisitedAt: place.last_visited_at,
    };
}

async function requireActiveProvince(id) {
    if (!(await provincesRepository.activeProvinceExists(id))) {
        throw new NotFoundError(...errorArgs(ERRORS.PROVINCE_NOT_FOUND));
    }
}

export async function listProvinces(userId, filters, pagination) {
    const { rows, total } = await provincesRepository.listForUser({
        userId,
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
    });

    return {
        data: rows.map(toProvinceDto),
        meta: paginationMeta({ ...pagination, total }),
    };
}

export async function listVisitedProvinces(userId, filters) {
    const rows = await provincesRepository.listVisitedForUser(userId, filters);
    return rows.map(toProvinceDto);
}

export async function getProvince(id, userId) {
    const province = await provincesRepository.findByIdForUser(id, userId);

    if (!province) {
        throw new NotFoundError(...errorArgs(ERRORS.PROVINCE_NOT_FOUND));
    }

    return toProvinceDto(province);
}

export async function listProvincePlaces(id, userId, filters, pagination) {
    await requireActiveProvince(id);

    const { rows, total } = await provincesRepository.listPlacesForUser({
        userId,
        provinceId: id,
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
    });

    return {
        data: rows.map(toPlaceDto),
        meta: paginationMeta({ ...pagination, total }),
    };
}
