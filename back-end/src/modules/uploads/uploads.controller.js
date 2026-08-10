import { asyncHandler } from "../../shared/http/async-handler.js";
import { getAuthenticatedUserId } from "../../shared/http/auth-context.js";
import { sendSuccess } from "../../shared/http/response.js";
import * as uploadsService from "./uploads.service.js";

export const createPresignedUrl = asyncHandler(async (req, res) => {
    const upload = await uploadsService.createPresignedUpload(
        getAuthenticatedUserId(req),
        req.body,
    );

    return sendSuccess(res, upload, { status: 201 });
});

export const getPresignedImageUrl = asyncHandler(async (req, res) => {
    const image = await uploadsService.createPresignedImageUrl(
        getAuthenticatedUserId(req),
        req.validated.query.objectKey,
    );

    return sendSuccess(res, image);
});
