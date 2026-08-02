import { getAuthenticatedUserId } from "../../shared/http/auth-context.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { sendSuccess } from "../../shared/http/response.js";
import { parsePagination } from "../../shared/pagination/pagination.js";
import * as provincesService from "./provinces.service.js";

export const listProvinces = asyncHandler(async (req, res) => {
    const filters = req.validated?.query ?? req.query;
    const result = await provincesService.listProvinces(
        getAuthenticatedUserId(req),
        filters,
        parsePagination(filters),
    );

    return sendSuccess(res, result.data, { meta: result.meta });
});

export const listVisitedProvinces = asyncHandler(async (req, res) => {
    const filters = req.validated?.query ?? req.query;
    const provinces = await provincesService.listVisitedProvinces(
        getAuthenticatedUserId(req),
        filters,
    );

    return sendSuccess(res, provinces);
});

export const getProvince = asyncHandler(async (req, res) => {
    const province = await provincesService.getProvince(
        req.params.id,
        getAuthenticatedUserId(req),
    );

    return sendSuccess(res, province);
});

export const listProvincePlaces = asyncHandler(async (req, res) => {
    const filters = req.validated?.query ?? req.query;
    const result = await provincesService.listProvincePlaces(
        req.params.id,
        getAuthenticatedUserId(req),
        filters,
        parsePagination(filters),
    );

    return sendSuccess(res, result.data, { meta: result.meta });
});
