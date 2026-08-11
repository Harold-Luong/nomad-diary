import { asyncHandler } from "../../shared/http/async-handler.js";
import { getAuthenticatedUserId } from "../../shared/http/auth-context.js";
import { sendNoContent, sendSuccess } from "../../shared/http/response.js";
import { parsePagination } from "../../shared/pagination/pagination.js";
import * as imagesService from "./images.service.js";

export const listImages = asyncHandler(async (req, res) => {
    const filters = req.validated.query;
    const result = await imagesService.listImages(
        getAuthenticatedUserId(req),
        filters,
        parsePagination(filters),
    );

    return sendSuccess(res, result.data, { meta: result.meta });
});

export const createImage = asyncHandler(async (req, res) => {
    const image = await imagesService.createImage(
        getAuthenticatedUserId(req),
        req.body,
    );

    return sendSuccess(res, image, { status: 201 });
});

export const getImage = asyncHandler(async (req, res) => {
    const image = await imagesService.getImage(
        req.params.id,
        getAuthenticatedUserId(req),
    );

    return sendSuccess(res, image);
});

export const updateImage = asyncHandler(async (req, res) => {
    const image = await imagesService.updateImage(
        req.params.id,
        getAuthenticatedUserId(req),
        req.body,
    );

    return sendSuccess(res, image);
});

export const deleteImage = asyncHandler(async (req, res) => {
    await imagesService.deleteImage(
        req.params.id,
        getAuthenticatedUserId(req),
    );

    return sendNoContent(res);
});
