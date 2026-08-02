import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import * as tripStopsController from "./trip-stops.controller.js";
import {
    createTripStopSchema,
    reorderTripStopsSchema,
    tripIdParamsSchema,
    tripStopIdParamsSchema,
    updateTripStopSchema,
} from "./trip-stops.schema.js";

const tripStopsRouter = Router();
const tripStopsByTripRouter = Router();

tripStopsRouter.use(authenticate);
tripStopsByTripRouter.use(authenticate);

tripStopsByTripRouter.get(
    "/:tripId/stops",
    validate(tripIdParamsSchema, "params"),
    tripStopsController.listTripStops,
);
tripStopsByTripRouter.post(
    "/:tripId/stops",
    validate(tripIdParamsSchema, "params"),
    validate(createTripStopSchema),
    tripStopsController.createTripStop,
);
tripStopsByTripRouter.patch(
    "/:tripId/stops/reorder",
    validate(tripIdParamsSchema, "params"),
    validate(reorderTripStopsSchema),
    tripStopsController.reorderTripStops,
);

tripStopsRouter.patch(
    "/:id",
    validate(tripStopIdParamsSchema, "params"),
    validate(updateTripStopSchema),
    tripStopsController.updateTripStop,
);
tripStopsRouter.delete(
    "/:id",
    validate(tripStopIdParamsSchema, "params"),
    tripStopsController.deleteTripStop,
);

export { tripStopsByTripRouter };
export default tripStopsRouter;
