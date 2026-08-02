import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from "../../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import * as tripsRepository from "./trips.repository.js";

function toTripDto(trip) {
    return {
        id: trip.id,
        title: trip.title,
        slug: trip.slug,
        description: trip.description,
        thumbnailUrl: trip.thumbnail_url,
        status: trip.status,
        startDate: trip.start_date,
        endDate: trip.end_date,
        isPublic: trip.is_public,
        stopCount: trip.stop_count ?? 0,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
    };
}

function assertDateRange(startDate, endDate) {
    if (startDate && endDate && endDate < startDate) {
        throw new ValidationError(
            ...errorArgs(ERRORS.INVALID_TRIP_DATE_RANGE),
        );
    }
}

function isUniqueViolation(error) {
    return error?.code === "23505";
}

async function requireOwnedTrip(id, userId) {
    const trip = await tripsRepository.findByIdForUser(id, userId);

    if (!trip) {
        throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
    }

    return trip;
}

export async function listTrips(userId, filters, pagination) {
    const { rows, total } = await tripsRepository.listForUser({
        userId,
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
    });

    return {
        data: rows.map(toTripDto),
        meta: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total,
            totalPages: Math.ceil(total / pagination.pageSize),
        },
    };
}

export async function getTrip(id, userId) {
    return toTripDto(await requireOwnedTrip(id, userId));
}

export async function createTrip(userId, data) {
    if (await tripsRepository.slugExistsForUser(userId, data.slug)) {
        throw new ConflictError(
            ...errorArgs(ERRORS.TRIP_SLUG_EXISTS),
        );
    }

    try {
        const trip = await tripsRepository.create(userId, data);
        return toTripDto(trip);
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw new ConflictError(
                ...errorArgs(ERRORS.TRIP_SLUG_EXISTS),
            );
        }

        throw error;
    }
}

export async function updateTrip(id, userId, data) {
    const existing = await requireOwnedTrip(id, userId);

    const startDate = Object.hasOwn(data, "startDate")
        ? data.startDate
        : existing.start_date;
    const endDate = Object.hasOwn(data, "endDate")
        ? data.endDate
        : existing.end_date;
    assertDateRange(startDate, endDate);

    if (
        Object.hasOwn(data, "slug") &&
        data.slug !== existing.slug &&
        (await tripsRepository.slugExistsForUser(userId, data.slug, id))
    ) {
        throw new ConflictError(
            ...errorArgs(ERRORS.TRIP_SLUG_EXISTS),
        );
    }

    try {
        const trip = await tripsRepository.update(id, userId, data);

        if (!trip) {
            throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
        }

        return toTripDto({ ...trip, stop_count: existing.stop_count });
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw new ConflictError(
                ...errorArgs(ERRORS.TRIP_SLUG_EXISTS),
            );
        }

        throw error;
    }
}

export async function deleteTrip(id, userId) {
    const deleted = await tripsRepository.softDelete(id, userId);

    if (!deleted) {
        throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
    }
}
