import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import * as placesController from "./places.controller.js";
import { listPlacesQuerySchema } from "./places.schema.js";

const placesRouter = Router();

placesRouter.use(authenticate);
placesRouter.get(
    "/",
    validate(listPlacesQuerySchema, "query"),
    placesController.listPlaces,
);

export default placesRouter;
