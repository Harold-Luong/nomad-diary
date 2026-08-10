import { isUniqueViolation } from "../../database/postgres-errors.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from "../../shared/errors/app-error.js";
import { paginationMeta } from "../../shared/pagination/pagination.js";
import {
    isOwnedImageObjectKey,
    resolveStoredImageReference,
} from "../uploads/uploads.service.js";
import * as imagesRepository from "./images.repository.js";

function assertOwnedImageKey(userId, objectKey) {
    if (!isOwnedImageObjectKey(userId, objectKey, "images")) {
        throw new ValidationError(...errorArgs(ERRORS.INVALID_IMAGE_OBJECT_KEY));
    }
}

function validateImageKeys(userId, data) {
    if (Object.hasOwn(data, "imageObjectKey")) {
        assertOwnedImageKey(userId, data.imageObjectKey);
    }

    if (
        Object.hasOwn(data, "thumbnailObjectKey") &&
        data.thumbnailObjectKey !== null
    ) {
        assertOwnedImageKey(userId, data.thumbnailObjectKey);
    }
}

async function toImageDto(image, userId) {
    const [source, thumbnail] = await Promise.all([
        resolveStoredImageReference(userId, image.image_key),
        resolveStoredImageReference(userId, image.thumbnail_key),
    ]);

    return {
        id: String(image.id),
        tripId: String(image.trip_id),
        tripStopId: image.trip_stop_id ? String(image.trip_stop_id) : null,
        imageUrl: source.imageUrl,
        imageObjectKey: source.objectKey,
        thumbnailUrl: thumbnail.imageUrl,
        thumbnailObjectKey: thumbnail.objectKey,
        originalFilename: image.original_filename ?? null,
        description: image.description ?? null,
        capturedAt: image.captured_at ?? null,
        latitude: image.latitude ?? null,
        longitude: image.longitude ?? null,
        width: image.width ?? null,
        height: image.height ?? null,
        fileSize: image.file_size ?? null,
        mimeType: image.mime_type ?? null,
        sortOrder: image.sort_order,
        isCover: image.is_cover,
        isFavorite: image.is_favorite,
        aiTags: image.ai_tags ?? null,
        place: image.trip_stop_id
            ? {
                id: image.place_id ? String(image.place_id) : null,
                name: image.place_name ?? null,
                slug: image.place_slug ?? null,
                provinceId: image.province_id ? String(image.province_id) : null,
                provinceName: image.province_name ?? null,
                provinceCode: image.province_code ?? null,
            }
            : null,
        createdAt: image.created_at,
        updatedAt: image.updated_at,
    };
}

async function requireOwnedTrip(tripId, userId) {
    const trip = await imagesRepository.findOwnedTrip(tripId, userId);

    if (!trip) {
        throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
    }
}

async function ensureOwnedTripStop(tripStopId, tripId, userId) {
    if (tripStopId === null || tripStopId === undefined) {
        return;
    }

    const stop = await imagesRepository.findOwnedTripStopForTrip(
        tripStopId,
        tripId,
        userId,
    );

    if (!stop) {
        throw new NotFoundError(...errorArgs(ERRORS.TRIP_STOP_NOT_FOUND));
    }
}

async function requireOwnedImage(imageId, userId) {
    const image = await imagesRepository.findByIdForUser(imageId, userId);

    if (!image) {
        throw new NotFoundError(...errorArgs(ERRORS.IMAGE_NOT_FOUND));
    }

    return image;
}

function mapImageWriteError(error) {
    if (isUniqueViolation(error)) {
        return new ConflictError(...errorArgs(ERRORS.IMAGE_COVER_EXISTS));
    }

    return error;
}

export async function listImages(userId, filters, pagination) {
    const { rows, total } = await imagesRepository.listForUser({
        userId,
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
    });

    return {
        data: await Promise.all(rows.map((image) => toImageDto(image, userId))),
        meta: paginationMeta({ ...pagination, total }),
    };
}

export async function getImage(imageId, userId) {
    return toImageDto(await requireOwnedImage(imageId, userId), userId);
}

export async function createImage(userId, data) {
    validateImageKeys(userId, data);
    await requireOwnedTrip(data.tripId, userId);
    await ensureOwnedTripStop(data.tripStopId, data.tripId, userId);

    try {
        const created = await imagesRepository.create(userId, data);

        if (!created) {
            throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
        }

        return toImageDto(
            await requireOwnedImage(created.id, userId),
            userId,
        );
    } catch (error) {
        throw mapImageWriteError(error);
    }
}

export async function updateImage(imageId, userId, data) {
    const existing = await requireOwnedImage(imageId, userId);
    validateImageKeys(userId, data);
    await ensureOwnedTripStop(data.tripStopId, existing.trip_id, userId);

    try {
        const updated = await imagesRepository.update(imageId, userId, data);

        if (!updated) {
            throw new NotFoundError(...errorArgs(ERRORS.IMAGE_NOT_FOUND));
        }

        return toImageDto(await requireOwnedImage(imageId, userId), userId);
    } catch (error) {
        throw mapImageWriteError(error);
    }
}

export async function deleteImage(imageId, userId) {
    const deleted = await imagesRepository.softDelete(imageId, userId);

    if (!deleted) {
        throw new NotFoundError(...errorArgs(ERRORS.IMAGE_NOT_FOUND));
    }
}
