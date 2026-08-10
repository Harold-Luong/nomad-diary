import swaggerJsdoc from "swagger-jsdoc";

import {
    REVISIT_STATUS,
    REVISIT_STATUS_VALUES,
    TRIP_SORT_VALUES,
    TRIP_STATUS,
    TRIP_STATUS_VALUES,
} from "../shared/constants/domain.js";
import { ERRORS } from "../shared/constants/errors.js";
import { PAGINATION } from "../shared/pagination/pagination.js";

const successResponse = (description = "Successful response") => ({
    description,
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Success" },
        },
    },
});

const errorResponse = (description) => ({
    description,
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
        },
    },
});

const bearer = [{ bearerAuth: [] }];

const definition = {
    openapi: "3.0.3",
    info: {
        title: "Nomad Diary API",
        version: "1.0.0",
        description:
            "REST API for a private travel diary. Private data is always scoped to the authenticated user.",
    },
    servers: [{ url: "/", description: "Current server" }],
    tags: [
        { name: "Health" },
        { name: "Authentication" },
        { name: "Trips" },
        { name: "Provinces" },
        { name: "Trip stops" },
        { name: "Reviews" },
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
        schemas: {
            Success: {
                type: "object",
                required: ["success", "data"],
                properties: {
                    success: { type: "boolean", example: true },
                    data: {},
                    meta: { type: "object", nullable: true },
                },
            },
            Error: {
                type: "object",
                required: ["success", "error"],
                properties: {
                    success: { type: "boolean", example: false },
                    error: {
                        type: "object",
                        properties: {
                            code: {
                                type: "string",
                                example: ERRORS.VALIDATION_ERROR.code,
                            },
                            message: {
                                type: "string",
                                example: ERRORS.VALIDATION_ERROR.message,
                            },
                            details: { nullable: true },
                        },
                    },
                },
            },
            RegisterInput: {
                type: "object",
                required: ["username", "email", "password"],
                properties: {
                    username: { type: "string", example: "nomad" },
                    email: { type: "string", format: "email", example: "nomad@example.com" },
                    password: {
                        type: "string",
                        format: "password",
                        minLength: 8,
                        example: "Password123!",
                    },
                    displayName: { type: "string", example: "Nomad" },
                },
            },
            LoginInput: {
                type: "object",
                required: ["identifier", "password"],
                properties: {
                    identifier: {
                        type: "string",
                        description: "Email or username",
                        example: "nomad@example.com",
                    },
                    password: {
                        type: "string",
                        format: "password",
                        example: "Password123!",
                    },
                },
            },
            RefreshTokenInput: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                    refreshToken: { type: "string", description: "Refresh JWT returned by login or register" },
                },
            },
            ProfileInput: {
                type: "object",
                properties: {
                    displayName: { type: "string", nullable: true },
                    avatarUrl: { type: "string", format: "uri", nullable: true },
                    bio: { type: "string", nullable: true },
                },
            },
            ChangePasswordInput: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                    currentPassword: { type: "string", format: "password" },
                    newPassword: { type: "string", format: "password", minLength: 8 },
                },
            },
            TripInput: {
                type: "object",
                required: ["title", "slug"],
                properties: {
                    title: { type: "string", example: "Da Lat 2026" },
                    slug: { type: "string", example: "da-lat-2026" },
                    description: { type: "string", nullable: true },
                    thumbnailUrl: { type: "string", format: "uri", nullable: true },
                    status: {
                        type: "integer",
                        enum: TRIP_STATUS_VALUES,
                        default: TRIP_STATUS.DRAFT,
                    },
                    startDate: { type: "string", format: "date", nullable: true },
                    endDate: { type: "string", format: "date", nullable: true },
                    isPublic: { type: "boolean", default: false },
                },
            },
            TripUpdateInput: {
                type: "object",
                minProperties: 1,
                properties: {
                    title: { type: "string", example: "Da Lat 2026 updated" },
                    slug: { type: "string", example: "da-lat-2026-updated" },
                    description: { type: "string", nullable: true },
                    thumbnailUrl: { type: "string", format: "uri", nullable: true },
                    status: { type: "integer", enum: TRIP_STATUS_VALUES },
                    startDate: { type: "string", format: "date", nullable: true },
                    endDate: { type: "string", format: "date", nullable: true },
                    isPublic: { type: "boolean" },
                },
            },
            ProvinceTracking: {
                type: "object",
                properties: {
                    id: { type: "string", example: "1" },
                    countryCode: { type: "string", example: "VN" },
                    code: {
                        type: "string",
                        example: "68",
                        description: "Stable code used to match the frontend GeoJSON",
                    },
                    name: { type: "string", example: "Lâm Đồng" },
                    slug: { type: "string", example: "lam-dong" },
                    centerLatitude: { type: "number", nullable: true },
                    centerLongitude: { type: "number", nullable: true },
                    visited: { type: "boolean", example: true },
                    tripCount: { type: "integer", example: 3 },
                    placeCount: {
                        type: "integer",
                        example: 8,
                        description: "Number of unique visited places",
                    },
                    visitCount: {
                        type: "integer",
                        example: 12,
                        description: "Number of active trip stops",
                    },
                    firstVisitedAt: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                    lastVisitedAt: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                },
            },
            ProvincePlaceTracking: {
                type: "object",
                properties: {
                    id: { type: "string", example: "10" },
                    provinceId: { type: "string", example: "1" },
                    name: { type: "string", example: "Hồ Xuân Hương" },
                    slug: { type: "string", example: "ho-xuan-huong" },
                    description: { type: "string", nullable: true },
                    district: { type: "string", nullable: true },
                    ward: { type: "string", nullable: true },
                    address: { type: "string", nullable: true },
                    latitude: { type: "number", example: 11.9416 },
                    longitude: { type: "number", example: 108.4383 },
                    websiteUrl: { type: "string", format: "uri", nullable: true },
                    mapUrl: { type: "string", format: "uri", nullable: true },
                    visited: { type: "boolean", example: true },
                    tripCount: { type: "integer", example: 2 },
                    visitCount: { type: "integer", example: 3 },
                    firstVisitedAt: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                    lastVisitedAt: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                },
            },
            TripStopInput: {
                type: "object",
                required: ["placeId"],
                properties: {
                    placeId: { type: "string", example: "10" },
                    visitOrder: { type: "integer", minimum: 1 },
                    arrivedAt: { type: "string", format: "date-time", nullable: true },
                    departedAt: { type: "string", format: "date-time", nullable: true },
                    title: { type: "string", nullable: true },
                    note: { type: "string", nullable: true },
                },
            },
            TripStopUpdateInput: {
                type: "object",
                minProperties: 1,
                properties: {
                    placeId: { type: "string", example: "10" },
                    visitOrder: { type: "integer", minimum: 1 },
                    arrivedAt: { type: "string", format: "date-time", nullable: true },
                    departedAt: { type: "string", format: "date-time", nullable: true },
                    title: { type: "string", nullable: true },
                    note: { type: "string", nullable: true },
                },
            },
            TripStopReorderInput: {
                type: "object",
                required: ["stops"],
                properties: {
                    stops: {
                        type: "array",
                        minItems: 1,
                        items: {
                            type: "object",
                            required: ["id", "visitOrder"],
                            properties: {
                                id: { type: "string", example: "1" },
                                visitOrder: { type: "integer", minimum: 1 },
                            },
                        },
                    },
                },
            },
            ReviewInput: {
                type: "object",
                properties: {
                    rating: { type: "integer", minimum: 1, maximum: 5, nullable: true },
                    revisitStatus: {
                        type: "integer",
                        enum: REVISIT_STATUS_VALUES,
                        default: REVISIT_STATUS.NOT_REVIEWED,
                    },
                    isFavorite: { type: "boolean", default: false },
                    note: { type: "string", nullable: true },
                    warningNote: { type: "string", nullable: true },
                },
            },
        },
    },
    paths: {
        "/health": {
            get: {
                tags: ["Health"],
                summary: "Check API health",
                responses: { 200: successResponse() },
            },
        },
        "/health/ready": {
            get: {
                tags: ["Health"],
                summary: "Check API and PostgreSQL readiness",
                responses: {
                    200: successResponse(),
                    500: errorResponse("Database unavailable"),
                },
            },
        },
        "/auth/register": {
            post: {
                tags: ["Authentication"],
                summary: "Create an account",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterInput" } } },
                },
                responses: { 201: successResponse("Account created"), 409: errorResponse("Username or email exists") },
            },
        },
        "/auth/login": {
            post: {
                tags: ["Authentication"],
                summary: "Authenticate and receive tokens",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/LoginInput" } } },
                },
                responses: { 200: successResponse(), 401: errorResponse("Invalid credentials") },
            },
        },
        "/auth/refresh-token": {
            post: {
                tags: ["Authentication"],
                summary: "Rotate a refresh token",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenInput" } } },
                },
                responses: { 200: successResponse(), 401: errorResponse("Invalid refresh token") },
            },
        },
        "/auth/logout": {
            post: {
                tags: ["Authentication"],
                security: bearer,
                summary: "Revoke the current refresh session",
                responses: { 204: { description: "Logged out" }, 401: errorResponse("Unauthenticated") },
            },
        },
        "/auth/me": {
            get: {
                tags: ["Authentication"],
                security: bearer,
                summary: "Get the current safe user profile",
                responses: { 200: successResponse(), 401: errorResponse("Unauthenticated") },
            },
            patch: {
                tags: ["Authentication"],
                security: bearer,
                summary: "Update the current profile",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/ProfileInput" } } },
                },
                responses: { 200: successResponse(), 401: errorResponse("Unauthenticated") },
            },
        },
        "/auth/change-password": {
            patch: {
                tags: ["Authentication"],
                security: bearer,
                summary: "Change the password and rotate the session",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/ChangePasswordInput" } } },
                },
                responses: { 200: successResponse(), 401: errorResponse("Unauthenticated") },
            },
        },
        "/auth/account": {
            delete: {
                tags: ["Authentication"],
                security: bearer,
                summary: "Soft-delete the current account",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["password"],
                                properties: { password: { type: "string", format: "password" } },
                            },
                        },
                    },
                },
                responses: { 204: { description: "Account deleted" }, 401: errorResponse("Unauthenticated") },
            },
        },
        "/trips": {
            get: {
                tags: ["Trips"],
                security: bearer,
                summary: "List the caller's trips",
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: PAGINATION.DEFAULT_PAGE } },
                    { name: "pageSize", in: "query", schema: { type: "integer", default: PAGINATION.DEFAULT_PAGE_SIZE, maximum: PAGINATION.MAX_PAGE_SIZE } },
                    { name: "status", in: "query", schema: { type: "integer", enum: TRIP_STATUS_VALUES } },
                    { name: "year", in: "query", schema: { type: "integer" } },
                    { name: "search", in: "query", schema: { type: "string" } },
                    { name: "sort", in: "query", schema: { type: "string", enum: TRIP_SORT_VALUES } },
                ],
                responses: { 200: successResponse(), 401: errorResponse("Unauthenticated") },
            },
            post: {
                tags: ["Trips"],
                security: bearer,
                summary: "Create a trip",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/TripInput" } } },
                },
                responses: { 201: successResponse("Trip created"), 422: errorResponse("Invalid trip") },
            },
        },
        "/trips/{id}": {
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            get: { tags: ["Trips"], security: bearer, summary: "Get a trip", responses: { 200: successResponse(), 404: errorResponse("Not found") } },
            patch: {
                tags: ["Trips"],
                security: bearer,
                summary: "Update a trip",
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TripUpdateInput" } } } },
                responses: { 200: successResponse(), 404: errorResponse("Not found") },
            },
            delete: { tags: ["Trips"], security: bearer, summary: "Soft-delete a trip", responses: { 204: { description: "Deleted" }, 404: errorResponse("Not found") } },
        },
        "/provinces": {
            get: {
                tags: ["Provinces"],
                security: bearer,
                summary: "List provinces with tracking statistics for the caller",
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: PAGINATION.DEFAULT_PAGE } },
                    { name: "pageSize", in: "query", schema: { type: "integer", default: PAGINATION.DEFAULT_PAGE_SIZE, maximum: PAGINATION.MAX_PAGE_SIZE } },
                    { name: "countryCode", in: "query", schema: { type: "string", minLength: 2, maxLength: 2, example: "VN" } },
                    { name: "search", in: "query", schema: { type: "string" } },
                    { name: "visited", in: "query", schema: { type: "boolean" } },
                ],
                responses: { 200: successResponse(), 401: errorResponse("Unauthenticated") },
            },
        },
        "/provinces/visited": {
            get: {
                tags: ["Provinces"],
                security: bearer,
                summary: "List visited provinces for map highlighting",
                description: "A province is visited when the caller owns at least one active trip stop at an active place in that province.",
                parameters: [
                    { name: "countryCode", in: "query", schema: { type: "string", minLength: 2, maxLength: 2, example: "VN" } },
                ],
                responses: { 200: successResponse(), 401: errorResponse("Unauthenticated") },
            },
        },
        "/provinces/{id}": {
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            get: {
                tags: ["Provinces"],
                security: bearer,
                summary: "Get a province with the caller's tracking statistics",
                responses: { 200: successResponse(), 404: errorResponse("Province not found") },
            },
        },
        "/provinces/{id}/places": {
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            get: {
                tags: ["Provinces"],
                security: bearer,
                summary: "List places in a province with tracking statistics",
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: PAGINATION.DEFAULT_PAGE } },
                    { name: "pageSize", in: "query", schema: { type: "integer", default: PAGINATION.DEFAULT_PAGE_SIZE, maximum: PAGINATION.MAX_PAGE_SIZE } },
                    { name: "search", in: "query", schema: { type: "string" } },
                    { name: "visited", in: "query", schema: { type: "boolean" }, description: "Use true to return only places the caller has visited" },
                ],
                responses: { 200: successResponse(), 404: errorResponse("Province not found") },
            },
        },
        "/trips/{tripId}/stops": {
            parameters: [{ name: "tripId", in: "path", required: true, schema: { type: "string" } }],
            get: { tags: ["Trip stops"], security: bearer, summary: "List a trip's stops", responses: { 200: successResponse() } },
            post: {
                tags: ["Trip stops"],
                security: bearer,
                summary: "Add a stop to a trip",
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TripStopInput" } } } },
                responses: { 201: successResponse("Stop created"), 422: errorResponse("Invalid stop") },
            },
        },
        "/trips/{tripId}/stops/reorder": {
            patch: {
                tags: ["Trip stops"],
                security: bearer,
                summary: "Atomically reorder every active stop in a trip",
                parameters: [{ name: "tripId", in: "path", required: true, schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TripStopReorderInput" } } } },
                responses: { 200: successResponse(), 422: errorResponse("Invalid stop ordering") },
            },
        },
        "/trip-stops/{id}": {
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            patch: {
                tags: ["Trip stops"],
                security: bearer,
                summary: "Update a stop",
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TripStopUpdateInput" } } } },
                responses: { 200: successResponse() },
            },
            delete: { tags: ["Trip stops"], security: bearer, summary: "Soft-delete a stop", responses: { 204: { description: "Deleted" } } },
        },
        "/trip-stops/{tripStopId}/review": {
            parameters: [{ name: "tripStopId", in: "path", required: true, schema: { type: "string" } }],
            get: { tags: ["Reviews"], security: bearer, summary: "Get a stop review", responses: { 200: successResponse(), 404: errorResponse("No review") } },
            put: {
                tags: ["Reviews"],
                security: bearer,
                summary: "Create or replace a stop review",
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReviewInput" } } } },
                responses: { 200: successResponse(), 422: errorResponse("Invalid review") },
            },
            delete: { tags: ["Reviews"], security: bearer, summary: "Soft-delete a review", responses: { 204: { description: "Deleted" } } },
        },
    },
};

export const openApiSpec = swaggerJsdoc({ definition, apis: [] });
