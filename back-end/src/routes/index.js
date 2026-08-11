import { Router } from "express";

import authRouter from "../modules/auth/auth.routes.js";
import imagesRouter from "../modules/images/images.routes.js";
import provincesRouter from "../modules/provinces/provinces.routes.js";
import reviewsRouter from "../modules/reviews/reviews.routes.js";
import tripStopsRouter, {
    tripStopsByTripRouter,
} from "../modules/trip-stops/trip-stops.routes.js";
import tripsRouter from "../modules/trips/trips.routes.js";
import uploadsRouter from "../modules/uploads/uploads.routes.js";
import { query } from "../database/pool.js";
import { asyncHandler } from "../shared/http/async-handler.js";
import { sendSuccess } from "../shared/http/response.js";

const router = Router();

router.get("/health", (_req, res) =>
    sendSuccess(res, {
        status: "ok",
        service: "nomad-diary-api",
    }),
);
router.get(
    "/health/ready",
    asyncHandler(async (_req, res) => {
        await query("SELECT 1");
        return sendSuccess(res, {
            status: "ready",
            service: "nomad-diary-api",
            database: "connected",
        });
    }),
);
router.use("/auth", authRouter);
router.use("/images", imagesRouter);
router.use("/provinces", provincesRouter);
router.use("/trips", tripStopsByTripRouter);
router.use("/trips", tripsRouter);
router.use("/trip-stops", reviewsRouter);
router.use("/trip-stops", tripStopsRouter);
router.use("/uploads", uploadsRouter);

export default router;
