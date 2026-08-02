import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import * as reviewsController from "./reviews.controller.js";
import { putReviewSchema, tripStopReviewParamsSchema } from "./reviews.schema.js";

const reviewsRouter = Router();

reviewsRouter.use(authenticate);

reviewsRouter.get(
    "/:tripStopId/review",
    validate(tripStopReviewParamsSchema, "params"),
    reviewsController.getReview,
);
reviewsRouter.put(
    "/:tripStopId/review",
    validate(tripStopReviewParamsSchema, "params"),
    validate(putReviewSchema),
    reviewsController.putReview,
);
reviewsRouter.delete(
    "/:tripStopId/review",
    validate(tripStopReviewParamsSchema, "params"),
    reviewsController.deleteReview,
);

export default reviewsRouter;
