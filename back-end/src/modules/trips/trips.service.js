import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from "../../shared/errors/app-error.js";
import { isUniqueViolation } from "../../database/postgres-errors.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { paginationMeta } from "../../shared/pagination/pagination.js";
import * as tripsRepository from "./trips.repository.js";
import {
    isOwnedImageObjectKey,
    resolveStoredImageReference,
} from "../uploads/uploads.service.js";

async function toTripDto(trip, userId) {
    const thumbnail = await resolveStoredImageReference(
        userId,
        trip.thumbnail_key,
    );

    return {
        id: trip.id,
        title: trip.title,
        slug: trip.slug,
        description: trip.description,
        thumbnailUrl: thumbnail.imageUrl,
        thumbnailObjectKey: thumbnail.objectKey,
        status: trip.status,
        startDate: trip.start_date,
        endDate: trip.end_date,
        isPublic: trip.is_public,
        stopCount: trip.stop_count ?? 0,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
    };
}

function normalizeTripImageReference(userId, data) {
    if (!Object.hasOwn(data, "thumbnailObjectKey")) {
        return data;
    }

    if (
        data.thumbnailObjectKey !== null &&
        !isOwnedImageObjectKey(
            userId,
            data.thumbnailObjectKey,
            "trip-cover",
        )
    ) {
        throw new ValidationError(
            ...errorArgs(ERRORS.INVALID_IMAGE_OBJECT_KEY),
        );
    }

    return data;
}

function assertDateRange(startDate, endDate) {
    if (startDate && endDate && endDate < startDate) {
        throw new ValidationError(
            ...errorArgs(ERRORS.INVALID_TRIP_DATE_RANGE),
        );
    }
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
        data: await Promise.all(rows.map((trip) => toTripDto(trip, userId))),
        meta: paginationMeta({ ...pagination, total }),
    };
}

export async function getTrip(id, userId) {
    return toTripDto(await requireOwnedTrip(id, userId), userId);
}

export async function createTrip(userId, data) {
    if (await tripsRepository.slugExistsForUser(userId, data.slug)) {
        throw new ConflictError(
            ...errorArgs(ERRORS.TRIP_SLUG_EXISTS),
        );
    }

    try {
        const normalizedData = normalizeTripImageReference(userId, data);
        const trip = await tripsRepository.create(userId, normalizedData);
        return toTripDto(trip, userId);
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
        const normalizedData = normalizeTripImageReference(userId, data);
        const trip = await tripsRepository.update(id, userId, normalizedData);

        if (!trip) {
            throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
        }

        return toTripDto(
            { ...trip, stop_count: existing.stop_count },
            userId,
        );
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
