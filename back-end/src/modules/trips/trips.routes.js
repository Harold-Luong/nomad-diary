import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import * as tripsController from "./trips.controller.js";
import {
    createTripSchema,
    listTripsQuerySchema,
    tripIdParamsSchema,
    updateTripSchema,
} from "./trips.schema.js";

const tripsRouter = Router();

tripsRouter.use(authenticate);

tripsRouter.get("/", validate(listTripsQuerySchema, "query"), tripsController.listTrips);
tripsRouter.post("/", validate(createTripSchema), tripsController.createTrip);
tripsRouter.get("/:id", validate(tripIdParamsSchema, "params"), tripsController.getTrip);
tripsRouter.patch(
    "/:id",
    validate(tripIdParamsSchema, "params"),
    validate(updateTripSchema),
    tripsController.updateTrip,
);
tripsRouter.delete(
    "/:id",
    validate(tripIdParamsSchema, "params"),
    tripsController.deleteTrip,
);

export default tripsRouter;
