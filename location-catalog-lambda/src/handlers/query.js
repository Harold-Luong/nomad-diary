import { createLocationCatalogRepository } from "../repositories/location-catalog.repository.js";
import { errorResponse, successResponse } from "../shared/response.js";

const defaultRepository = createLocationCatalogRepository();

function getRequestMethod(event) {
    return event?.requestContext?.http?.method || event?.httpMethod || "GET";
}

function getRequestPath(event) {
    const path = event?.rawPath || event?.requestContext?.http?.path || event?.path;

    if (!path) {
        return "/v1/health";
    }

    return path.length > 1 ? path.replace(/\/$/, "") : path;
}

function getRequestId(event) {
    return event?.requestContext?.requestId;
}

function isProvinceCode(value) {
    return /^\d{2}$/.test(value);
}

export function createHandler({ repository = defaultRepository } = {}) {
    return async function queryHandler(event = {}) {
        const method = getRequestMethod(event);
        const path = getRequestPath(event);
        const requestId = getRequestId(event);

        if (method !== "GET") {
            return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", {
                statusCode: 405,
                requestId,
            });
        }

        try {
            if (path === "/v1/health") {
                return successResponse({
                    service: "location-catalog",
                    status: "ok",
                });
            }

            if (path === "/v1/provinces") {
                const provinces = await repository.listProvinces();
                return successResponse(provinces, { meta: { nextCursor: null } });
            }

            // example path: /v1/provinces/01/wards
            const wardsRoute = path.match(/^\/v1\/provinces\/([^/]+)\/wards$/);
            if (wardsRoute) {
                const provinceCode = wardsRoute[1];
                if (!isProvinceCode(provinceCode)) {
                    return errorResponse("VALIDATION_ERROR", "provinceCode must contain 2 digits", {
                        statusCode: 400,
                        requestId,
                    });
                }

                const wards = await repository.listWards(provinceCode);
                return successResponse(wards, { meta: { nextCursor: null } });
            }

            return errorResponse("ROUTE_NOT_FOUND", "Route not found", {
                statusCode: 404,
                requestId,
            });
        } catch (error) {
            console.error(
                JSON.stringify({
                    level: "error",
                    event: "query_failed",
                    requestId,
                    method,
                    path,
                    errorName: error?.name,
                    message: error?.message,
                }),
            );

            return errorResponse("INTERNAL_ERROR", "Internal server error", {
                statusCode: 500,
                requestId,
            });
        }
    };
}

export const handler = createHandler();
