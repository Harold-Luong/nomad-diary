import { ERRORS } from "../constants/errors.js";

export class AppError extends Error {
    constructor(code, message, details = null, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.statusCode = statusCode;
    }
}

export class ValidationError extends AppError {
    constructor(
        code = ERRORS.VALIDATION_ERROR.code,
        message = ERRORS.VALIDATION_ERROR.message,
        details = null,
    ) {
        super(code, message, details, 422);
    }
}

export class AuthenticationError extends AppError {
    constructor(
        code = ERRORS.UNAUTHENTICATED.code,
        message = ERRORS.UNAUTHENTICATED.message,
        details = null,
    ) {
        super(code, message, details, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(
        code = ERRORS.FORBIDDEN.code,
        message = ERRORS.FORBIDDEN.message,
        details = null,
    ) {
        super(code, message, details, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(
        code = ERRORS.NOT_FOUND.code,
        message = ERRORS.NOT_FOUND.message,
        details = null,
    ) {
        super(code, message, details, 404);
    }
}

export class ConflictError extends AppError {
    constructor(
        code = ERRORS.CONFLICT.code,
        message = ERRORS.CONFLICT.message,
        details = null,
    ) {
        super(code, message, details, 409);
    }
}

export class ConfigurationError extends AppError {
    constructor(
        code = ERRORS.CONFIGURATION_ERROR.code,
        message = ERRORS.CONFIGURATION_ERROR.message,
        details = null,
    ) {
        super(code, message, details, 500);
    }
}
