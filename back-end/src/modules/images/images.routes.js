import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import * as imagesController from "./images.controller.js";
import {
    createImageSchema,
    imageIdParamsSchema,
    listImagesQuerySchema,
    updateImageSchema,
} from "./images.schema.js";

const imagesRouter = Router();

imagesRouter.use(authenticate);

imagesRouter.get(
    "/",
    validate(listImagesQuerySchema, "query"),
    imagesController.listImages,
);
imagesRouter.post("/", validate(createImageSchema), imagesController.createImage);
imagesRouter.get(
    "/:id",
    validate(imageIdParamsSchema, "params"),
    imagesController.getImage,
);
imagesRouter.patch(
    "/:id",
    validate(imageIdParamsSchema, "params"),
    validate(updateImageSchema),
    imagesController.updateImage,
);
imagesRouter.delete(
    "/:id",
    validate(imageIdParamsSchema, "params"),
    imagesController.deleteImage,
);

export default imagesRouter;
