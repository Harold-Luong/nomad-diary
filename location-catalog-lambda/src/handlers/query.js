import { createLocationCatalogRepository } from "../repositories/location-catalog.repository.js";
import { decodeCursor, encodeCursor } from "../shared/cursor.js";
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

function getQueryParameters(event) {
    return event?.queryStringParameters || {};
}

function isProvinceCode(value) {
    return /^\d{2}$/.test(value);
}

function isWardCode(value) {
    return /^\d{5}$/.test(value);
}

function isPlaceId(value) {
    return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function validationError(message, requestId) {
    return errorResponse("VALIDATION_ERROR", message, {
        statusCode: 400,
        requestId,
    });
}

function isPlaceCursorKey(value, expectedPartitionKey) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;

    return (
        value.GSI2PK === expectedPartitionKey &&
        typeof value.GSI2SK === "string" &&
        typeof value.PK === "string" &&
        typeof value.SK === "string"
    );
}

function parsePlaceListOptions(event, { provinceCode, wardCode }) {
    const query = getQueryParameters(event);
    const search = typeof query.search === "string" ? query.search.trim() : undefined;

    if (query.search !== undefined && (!search || search.length > 100)) {
        return { error: "search must contain between 1 and 100 characters" };
    }

    let featured;
    if (query.featured !== undefined) {
        if (query.featured !== "true" && query.featured !== "false") {
            return { error: "featured must be true or false" };
        }
        featured = query.featured === "true";
    }

    const rawLimit = query.limit ?? "20";
    if (!/^\d+$/.test(rawLimit)) {
        return { error: "limit must be an integer between 1 and 50" };
    }

    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return { error: "limit must be an integer between 1 and 50" };
    }

    let exclusiveStartKey;
    if (query.cursor !== undefined) {
        try {
            const cursor = decodeCursor(query.cursor);
            const expectedScope = { provinceCode, wardCode, search: search || "", featured };
            const expectedPartitionKey = `PROVINCE#${provinceCode}#WARD#${wardCode}#PLACES`;

            if (
                cursor.scope?.provinceCode !== expectedScope.provinceCode ||
                cursor.scope?.wardCode !== expectedScope.wardCode ||
                cursor.scope?.search !== expectedScope.search ||
                cursor.scope?.featured !== expectedScope.featured ||
                !isPlaceCursorKey(cursor.key, expectedPartitionKey)
            ) {
                return { error: "cursor does not match the requested place list" };
            }

            exclusiveStartKey = cursor.key;
        } catch {
            return { error: "cursor is invalid" };
        }
    }

    return {
        value: {
            search,
            featured,
            limit,
            exclusiveStartKey,
            cursorScope: { provinceCode, wardCode, search: search || "", featured },
        },
    };
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

            // example path: /v1/provinces/01/wards/01001/places
            const placesRoute = path.match(
                /^\/v1\/provinces\/([^/]+)\/wards\/([^/]+)\/places$/,
            );
            if (placesRoute) {
                const [, provinceCode, wardCode] = placesRoute;
                if (!isProvinceCode(provinceCode)) {
                    return validationError("provinceCode must contain 2 digits", requestId);
                }
                if (!isWardCode(wardCode)) {
                    return validationError("wardCode must contain 5 digits", requestId);
                }

                const parsedOptions = parsePlaceListOptions(event, { provinceCode, wardCode });
                if (parsedOptions.error) {
                    return validationError(parsedOptions.error, requestId);
                }

                const ward = await repository.getActiveWard(provinceCode, wardCode);
                if (!ward) {
                    return errorResponse("WARD_NOT_FOUND", "Ward not found", {
                        statusCode: 404,
                        requestId,
                    });
                }

                const { cursorScope, ...repositoryOptions } = parsedOptions.value;
                const result = await repository.listPlacesByWard(
                    provinceCode,
                    wardCode,
                    repositoryOptions,
                );
                const nextCursor = result.lastEvaluatedKey
                    ? encodeCursor({ key: result.lastEvaluatedKey, scope: cursorScope })
                    : null;

                return successResponse(result.items, { meta: { nextCursor } });
            }

            // example path: /v1/provinces/01/places/abc123
            const placeRoute = path.match(/^\/v1\/provinces\/([^/]+)\/places\/([^/]+)$/);
            if (placeRoute) {
                const [, provinceCode, placeId] = placeRoute;
                if (!isProvinceCode(provinceCode)) {
                    return validationError("provinceCode must contain 2 digits", requestId);
                }
                if (!isPlaceId(placeId)) {
                    return validationError("placeId is invalid", requestId);
                }

                const place = await repository.getActivePlace(provinceCode, placeId);
                if (!place) {
                    return errorResponse("PLACE_NOT_FOUND", "Place not found", {
                        statusCode: 404,
                        requestId,
                    });
                }

                return successResponse(place);
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
