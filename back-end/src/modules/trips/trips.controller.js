import { AuthenticationError } from "../../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { sendNoContent, sendSuccess } from "../../shared/http/response.js";
import { parsePagination } from "../../shared/pagination/pagination.js";
import * as tripsService from "./trips.service.js";

function getAuthenticatedUserId(req) {
    if (!req.auth?.userId) {
        throw new AuthenticationError(...errorArgs(ERRORS.UNAUTHENTICATED));
    }

    return req.auth.userId;
}

export const listTrips = asyncHandler(async (req, res) => {
    const filters = req.validated?.query ?? req.query;
    const result = await tripsService.listTrips(
        getAuthenticatedUserId(req),
        filters,
        parsePagination(filters),
    );

    return sendSuccess(res, result.data, { meta: result.meta });
});

export const getTrip = asyncHandler(async (req, res) => {
    const trip = await tripsService.getTrip(req.params.id, getAuthenticatedUserId(req));
    return sendSuccess(res, trip);
});

export const createTrip = asyncHandler(async (req, res) => {
    const trip = await tripsService.createTrip(getAuthenticatedUserId(req), req.body);
    return sendSuccess(res, trip, { status: 201 });
});

export const updateTrip = asyncHandler(async (req, res) => {
    const trip = await tripsService.updateTrip(
        req.params.id,
        getAuthenticatedUserId(req),
        req.body,
    );
    return sendSuccess(res, trip);
});

export const deleteTrip = asyncHandler(async (req, res) => {
    await tripsService.deleteTrip(req.params.id, getAuthenticatedUserId(req));
    return sendNoContent(res);
});
