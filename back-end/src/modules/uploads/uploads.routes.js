import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import * as uploadsController from "./uploads.controller.js";
import { createPresignedUploadSchema, getPresignedImageQuerySchema } from "./uploads.schema.js";

const uploadsRouter = Router();

uploadsRouter.use(authenticate);

uploadsRouter.get("/presigned-url", validate(getPresignedImageQuerySchema, "query"), uploadsController.getPresignedImageUrl);

uploadsRouter.post("/presigned-url", validate(createPresignedUploadSchema), uploadsController.createPresignedUrl);

export default uploadsRouter;
