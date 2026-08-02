import { AuthenticationError } from "../../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { sendNoContent, sendSuccess } from "../../shared/http/response.js";
import * as tripStopsService from "./trip-stops.service.js";

function getAuthenticatedUserId(req) {
    if (!req.auth?.userId) {
        throw new AuthenticationError(...errorArgs(ERRORS.UNAUTHENTICATED));
    }

    return req.auth.userId;
}

export const listTripStops = asyncHandler(async (req, res) => {
    const stops = await tripStopsService.listTripStops(
        req.params.tripId,
        getAuthenticatedUserId(req),
    );
    return sendSuccess(res, stops);
});

export const createTripStop = asyncHandler(async (req, res) => {
    const stop = await tripStopsService.createTripStop(
        req.params.tripId,
        getAuthenticatedUserId(req),
        req.body,
    );
    return sendSuccess(res, stop, { status: 201 });
});

export const updateTripStop = asyncHandler(async (req, res) => {
    const stop = await tripStopsService.updateTripStop(
        req.params.id,
        getAuthenticatedUserId(req),
        req.body,
    );
    return sendSuccess(res, stop);
});

export const deleteTripStop = asyncHandler(async (req, res) => {
    await tripStopsService.deleteTripStop(req.params.id, getAuthenticatedUserId(req));
    return sendNoContent(res);
});

export const reorderTripStops = asyncHandler(async (req, res) => {
    const stops = await tripStopsService.reorderTripStops(
        req.params.tripId,
        getAuthenticatedUserId(req),
        req.body.stops,
    );
    return sendSuccess(res, stops);
});
