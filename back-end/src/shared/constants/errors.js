const defineError = (code, message) => Object.freeze({ code, message });

export const ERRORS = Object.freeze({
    INTERNAL_SERVER_ERROR: defineError(
        "INTERNAL_SERVER_ERROR",
        "An unexpected server error occurred",
    ),
    CONFIGURATION_ERROR: defineError(
        "CONFIGURATION_ERROR",
        "The server is not configured correctly",
    ),
    VALIDATION_ERROR: defineError(
        "VALIDATION_ERROR",
        "The request contains invalid data",
    ),
    UNAUTHENTICATED: defineError(
        "UNAUTHENTICATED",
        "Authentication is required",
    ),
    FORBIDDEN: defineError(
        "FORBIDDEN",
        "You are not allowed to perform this action",
    ),
    NOT_FOUND: defineError("NOT_FOUND", "Resource not found"),
    CONFLICT: defineError("CONFLICT", "The resource already exists"),

    INVALID_JSON: defineError(
        "INVALID_JSON",
        "Request body contains invalid JSON",
    ),
    INVALID_PAGINATION: defineError(
        "INVALID_PAGINATION",
        "page and pageSize must be positive integers",
    ),
    ROUTE_NOT_FOUND: defineError("ROUTE_NOT_FOUND", "Route not found"),
    CORS_ORIGIN_NOT_ALLOWED: defineError(
        "CORS_ORIGIN_NOT_ALLOWED",
        "The request origin is not allowed",
    ),
    S3_UPLOAD_NOT_CONFIGURED: defineError(
        "S3_UPLOAD_NOT_CONFIGURED",
        "S3 image uploads are not configured",
    ),
    RATE_LIMITED: defineError(
        "RATE_LIMITED",
        "Too many requests. Please try again later.",
    ),
    AUTH_RATE_LIMITED: defineError(
        "AUTH_RATE_LIMITED",
        "Too many authentication attempts. Please try again later.",
    ),

    DUPLICATE_RESOURCE: defineError(
        "DUPLICATE_RESOURCE",
        "An active resource with the same unique value already exists",
    ),
    INVALID_REFERENCE: defineError(
        "INVALID_REFERENCE",
        "A referenced resource does not exist",
    ),
    CONSTRAINT_VIOLATION: defineError(
        "CONSTRAINT_VIOLATION",
        "The request violates a data constraint",
    ),
    MISSING_REQUIRED_VALUE: defineError(
        "MISSING_REQUIRED_VALUE",
        "A required value is missing",
    ),
    INVALID_VALUE: defineError(
        "INVALID_VALUE",
        "A request value has an invalid format",
    ),

    JWT_NOT_CONFIGURED: defineError(
        "JWT_NOT_CONFIGURED",
        "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be configured",
    ),
    MISSING_ACCESS_TOKEN: defineError(
        "MISSING_ACCESS_TOKEN",
        "A bearer access token is required",
    ),
    INVALID_ACCESS_TOKEN: defineError(
        "INVALID_ACCESS_TOKEN",
        "The access token is invalid, expired, or inactive",
    ),
    INVALID_REFRESH_TOKEN: defineError(
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid or expired",
    ),
    INVALID_CREDENTIALS: defineError(
        "INVALID_CREDENTIALS",
        "Invalid email or password",
    ),
    EMAIL_ALREADY_EXISTS: defineError(
        "EMAIL_ALREADY_EXISTS",
        "Email is already in use",
    ),
    USERNAME_ALREADY_EXISTS: defineError(
        "USERNAME_ALREADY_EXISTS",
        "Username is already in use",
    ),
    PASSWORD_REUSE: defineError(
        "PASSWORD_REUSE",
        "New password must be different from current password",
    ),

    TRIP_NOT_FOUND: defineError("TRIP_NOT_FOUND", "Trip not found"),
    TRIP_SLUG_EXISTS: defineError(
        "TRIP_SLUG_EXISTS",
        "A trip with this slug already exists",
    ),
    INVALID_TRIP_DATE_RANGE: defineError(
        "INVALID_TRIP_DATE_RANGE",
        "endDate cannot be before startDate",
    ),

    PROVINCE_NOT_FOUND: defineError("PROVINCE_NOT_FOUND", "Province not found"),

    TRIP_STOP_NOT_FOUND: defineError(
        "TRIP_STOP_NOT_FOUND",
        "Trip stop not found",
    ),
    PLACE_NOT_FOUND: defineError("PLACE_NOT_FOUND", "Place not found"),
    TRIP_STOP_ORDER_EXISTS: defineError(
        "TRIP_STOP_ORDER_EXISTS",
        "Another active stop already uses this visitOrder",
    ),
    INVALID_STOP_TIME_RANGE: defineError(
        "INVALID_STOP_TIME_RANGE",
        "departedAt cannot be before arrivedAt",
    ),
    INCOMPLETE_STOP_REORDER: defineError(
        "INCOMPLETE_STOP_REORDER",
        "Reorder requests must include every active stop in the trip",
    ),
    INVALID_STOP_REORDER: defineError(
        "INVALID_STOP_REORDER",
        "Stops must belong to the trip and use a contiguous visitOrder sequence starting at 1",
    ),
    STOP_ORDER_OUT_OF_RANGE: defineError(
        "STOP_ORDER_OUT_OF_RANGE",
        "Trip stop order is outside the supported range",
    ),

    REVIEW_NOT_FOUND: defineError("REVIEW_NOT_FOUND", "Review not found"),
});

export const errorArgs = (definition) => [definition.code, definition.message];
