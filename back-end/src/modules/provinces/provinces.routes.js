import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import * as provincesController from "./provinces.controller.js";
import {
    listProvincePlacesQuerySchema,
    listProvincesQuerySchema,
    listVisitedProvincesQuerySchema,
    provinceIdParamsSchema,
} from "./provinces.schema.js";

const provincesRouter = Router();

provincesRouter.use(authenticate);

provincesRouter.get(
    "/",
    validate(listProvincesQuerySchema, "query"),
    provincesController.listProvinces,
);
provincesRouter.get(
    "/visited",
    validate(listVisitedProvincesQuerySchema, "query"),
    provincesController.listVisitedProvinces,
);
provincesRouter.get(
    "/:id",
    validate(provinceIdParamsSchema, "params"),
    provincesController.getProvince,
);
provincesRouter.get(
    "/:id/places",
    validate(provinceIdParamsSchema, "params"),
    validate(listProvincePlacesQuerySchema, "query"),
    provincesController.listProvincePlaces,
);

export default provincesRouter;
