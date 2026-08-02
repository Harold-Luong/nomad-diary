import { AuthenticationError } from "../../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { sendNoContent, sendSuccess } from "../../shared/http/response.js";
import * as reviewsService from "./reviews.service.js";

function getAuthenticatedUserId(req) {
    if (!req.auth?.userId) {
        throw new AuthenticationError(...errorArgs(ERRORS.UNAUTHENTICATED));
    }

    return req.auth.userId;
}

export const getReview = asyncHandler(async (req, res) => {
    const review = await reviewsService.getReview(
        req.params.tripStopId,
        getAuthenticatedUserId(req),
    );
    return sendSuccess(res, review);
});

export const putReview = asyncHandler(async (req, res) => {
    const review = await reviewsService.putReview(
        req.params.tripStopId,
        getAuthenticatedUserId(req),
        req.body,
    );
    return sendSuccess(res, review);
});

export const deleteReview = asyncHandler(async (req, res) => {
    await reviewsService.deleteReview(
        req.params.tripStopId,
        getAuthenticatedUserId(req),
    );
    return sendNoContent(res);
});
