import { withTransaction } from "../../database/transaction.js";
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from "../../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import * as tripStopsRepository from "./trip-stops.repository.js";

const MAX_POSTGRES_INTEGER = 2_147_483_647;

function toTripStopDto(stop) {
    return {
        id: stop.id,
        tripId: stop.trip_id,
        placeId: stop.place_id,
        visitOrder: stop.visit_order,
        arrivedAt: stop.arrived_at,
        departedAt: stop.departed_at,
        title: stop.title,
        note: stop.note,
        place: {
            id: stop.place_id,
            name: stop.place_name,
            slug: stop.place_slug,
            provinceId: stop.province_id,
            provinceName: stop.province_name,
            provinceCode: stop.province_code,
        },
        createdAt: stop.created_at,
        updatedAt: stop.updated_at,
    };
}

function asTime(value) {
    if (!value) {
        return null;
    }

    return new Date(value).getTime();
}

function assertStopTimes(arrivedAt, departedAt) {
    const arrivedAtTime = asTime(arrivedAt);
    const departedAtTime = asTime(departedAt);

    if (
        arrivedAtTime !== null &&
        departedAtTime !== null &&
        departedAtTime < arrivedAtTime
    ) {
        throw new ValidationError(
            ...errorArgs(ERRORS.INVALID_STOP_TIME_RANGE),
        );
    }
}

function isUniqueViolation(error) {
    return error?.code === "23505";
}

async function requireOwnedTrip(tripId, userId, executor) {
    const trip = await tripStopsRepository.findOwnedTrip(tripId, userId, executor);

    if (!trip) {
        throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
    }

    return trip;
}

async function requireOwnedStop(stopId, userId, executor) {
    const stop = await tripStopsRepository.findByIdForUser(stopId, userId, executor);

    if (!stop) {
        throw new NotFoundError(...errorArgs(ERRORS.TRIP_STOP_NOT_FOUND));
    }

    return stop;
}

async function ensureActivePlace(placeId, executor) {
    const place = await tripStopsRepository.findActivePlace(placeId, executor);

    if (!place) {
        throw new NotFoundError(...errorArgs(ERRORS.PLACE_NOT_FOUND));
    }
}

async function ensureVisitOrderAvailable(
    tripId,
    visitOrder,
    excludeStopId,
    executor,
) {
    const conflictingStop = await tripStopsRepository.findActiveByTripAndOrder(
        tripId,
        visitOrder,
        excludeStopId,
        executor,
    );

    if (conflictingStop) {
        throw new ConflictError(
            ...errorArgs(ERRORS.TRIP_STOP_ORDER_EXISTS),
        );
    }
}

function validateCompleteReorder(activeStops, requestedStops) {
    if (activeStops.length !== requestedStops.length) {
        throw new ValidationError(
            ...errorArgs(ERRORS.INCOMPLETE_STOP_REORDER),
        );
    }

    const activeIds = new Set(activeStops.map((stop) => String(stop.id)));
    const requestedIds = new Set(requestedStops.map((stop) => String(stop.id)));

    if (
        requestedIds.size !== activeIds.size ||
        [...requestedIds].some((id) => !activeIds.has(id))
    ) {
        throw new ValidationError(
            ...errorArgs(ERRORS.INVALID_STOP_REORDER),
        );
    }

    const expectedOrders = new Set(
        Array.from({ length: activeStops.length }, (_value, index) => index + 1),
    );
    const requestedOrders = new Set(requestedStops.map((stop) => stop.visitOrder));

    if (
        requestedOrders.size !== expectedOrders.size ||
        [...expectedOrders].some((order) => !requestedOrders.has(order))
    ) {
        throw new ValidationError(
            ...errorArgs(ERRORS.INVALID_STOP_REORDER),
        );
    }
}

export async function listTripStops(tripId, userId) {
    await requireOwnedTrip(tripId, userId);
    const stops = await tripStopsRepository.listForTrip(tripId, userId);
    return stops.map(toTripStopDto);
}

export async function createTripStop(tripId, userId, data) {
    try {
        return await withTransaction(async (client) => {
            const trip = await tripStopsRepository.lockOwnedTrip(
                tripId,
                userId,
                client,
            );

            if (!trip) {
                throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
            }

            await ensureActivePlace(data.placeId, client);
            const visitOrder =
                data.visitOrder ??
                (await tripStopsRepository.getNextVisitOrder(tripId, client));

            if (visitOrder > MAX_POSTGRES_INTEGER) {
                throw new ValidationError(
                    ...errorArgs(ERRORS.STOP_ORDER_OUT_OF_RANGE),
                );
            }

            await ensureVisitOrderAvailable(tripId, visitOrder, undefined, client);
            const created = await tripStopsRepository.create(
                tripId,
                { ...data, visitOrder },
                client,
            );
            const stop = await requireOwnedStop(created.id, userId, client);
            return toTripStopDto(stop);
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw new ConflictError(
                ...errorArgs(ERRORS.TRIP_STOP_ORDER_EXISTS),
            );
        }

        throw error;
    }
}

export async function updateTripStop(stopId, userId, data) {
    const existing = await requireOwnedStop(stopId, userId);

    if (Object.hasOwn(data, "placeId") && data.placeId !== String(existing.place_id)) {
        await ensureActivePlace(data.placeId);
    }

    if (
        Object.hasOwn(data, "visitOrder") &&
        data.visitOrder !== existing.visit_order
    ) {
        await ensureVisitOrderAvailable(
            existing.trip_id,
            data.visitOrder,
            stopId,
        );
    }

    const arrivedAt = Object.hasOwn(data, "arrivedAt")
        ? data.arrivedAt
        : existing.arrived_at;
    const departedAt = Object.hasOwn(data, "departedAt")
        ? data.departedAt
        : existing.departed_at;
    assertStopTimes(arrivedAt, departedAt);

    try {
        const updated = await tripStopsRepository.update(stopId, userId, data);

        if (!updated) {
            throw new NotFoundError(...errorArgs(ERRORS.TRIP_STOP_NOT_FOUND));
        }

        const stop = await requireOwnedStop(stopId, userId);
        return toTripStopDto(stop);
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw new ConflictError(
                ...errorArgs(ERRORS.TRIP_STOP_ORDER_EXISTS),
            );
        }

        throw error;
    }
}

export async function deleteTripStop(stopId, userId) {
    const deleted = await tripStopsRepository.softDelete(stopId, userId);

    if (!deleted) {
        throw new NotFoundError(...errorArgs(ERRORS.TRIP_STOP_NOT_FOUND));
    }
}

export async function reorderTripStops(tripId, userId, requestedStops) {
    return withTransaction(async (client) => {
        const trip = await tripStopsRepository.lockOwnedTrip(tripId, userId, client);

        if (!trip) {
            throw new NotFoundError(...errorArgs(ERRORS.TRIP_NOT_FOUND));
        }

        const activeStops = await tripStopsRepository.lockActiveStopsForTrip(
            tripId,
            client,
        );
        validateCompleteReorder(activeStops, requestedStops);

        const largestExistingOrder = Math.max(
            ...activeStops.map((stop) => stop.visit_order),
        );
        const largestRequestedOrder = Math.max(
            ...requestedStops.map((stop) => stop.visitOrder),
        );
        const offset =
            Math.max(largestExistingOrder, largestRequestedOrder) +
            activeStops.length +
            1;

        if (largestExistingOrder + offset > MAX_POSTGRES_INTEGER) {
            throw new ValidationError(
                ...errorArgs(ERRORS.STOP_ORDER_OUT_OF_RANGE),
            );
        }

        await tripStopsRepository.moveActiveOrdersOutOfRange(
            tripId,
            offset,
            client,
        );

        for (const stop of requestedStops) {
            await tripStopsRepository.updateVisitOrder(
                stop.id,
                stop.visitOrder,
                client,
            );
        }

        const reorderedStops = await tripStopsRepository.listForTrip(
            tripId,
            userId,
            client,
        );
        return reorderedStops.map(toTripStopDto);
    });
}
