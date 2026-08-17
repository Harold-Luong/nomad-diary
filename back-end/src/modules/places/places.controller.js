import { asyncHandler } from "../../shared/http/async-handler.js";
import { getAuthenticatedUserId } from "../../shared/http/auth-context.js";
import { sendSuccess } from "../../shared/http/response.js";
import { parsePagination } from "../../shared/pagination/pagination.js";
import * as placesService from "./places.service.js";

export const listPlaces = asyncHandler(async (req, res) => {
    const filters = req.validated?.query ?? req.query;
    const result = await placesService.listPlaces(
        getAuthenticatedUserId(req),
        filters,
        parsePagination(filters),
    );

    return sendSuccess(res, result.data, { meta: result.meta });
});
