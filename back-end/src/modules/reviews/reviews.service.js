import { NotFoundError } from "../../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import * as reviewsRepository from "./reviews.repository.js";

function toReviewDto(review) {
    return {
        id: review.id,
        tripStopId: review.trip_stop_id,
        rating: review.rating,
        revisitStatus: review.revisit_status,
        isFavorite: review.is_favorite,
        note: review.note,
        warningNote: review.warning_note,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
    };
}

async function requireOwnedStop(tripStopId, userId) {
    const stop = await reviewsRepository.findOwnedActiveStop(tripStopId, userId);

    if (!stop) {
        throw new NotFoundError(...errorArgs(ERRORS.TRIP_STOP_NOT_FOUND));
    }
}

export async function getReview(tripStopId, userId) {
    await requireOwnedStop(tripStopId, userId);
    const review = await reviewsRepository.findActiveForOwnedStop(tripStopId, userId);

    if (!review) {
        throw new NotFoundError(...errorArgs(ERRORS.REVIEW_NOT_FOUND));
    }

    return toReviewDto(review);
}

export async function putReview(tripStopId, userId, data) {
    await requireOwnedStop(tripStopId, userId);
    const review = await reviewsRepository.upsert(tripStopId, data);
    return toReviewDto(review);
}

export async function deleteReview(tripStopId, userId) {
    await requireOwnedStop(tripStopId, userId);
    const deleted = await reviewsRepository.softDeleteForOwnedStop(
        tripStopId,
        userId,
    );

    if (!deleted) {
        throw new NotFoundError(...errorArgs(ERRORS.REVIEW_NOT_FOUND));
    }
}
