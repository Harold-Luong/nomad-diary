import { AppError, ConflictError } from "../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../shared/constants/errors.js";

const mapDatabaseError = (error) => {
    if (error?.code === "23505") {
        return new ConflictError(...errorArgs(ERRORS.DUPLICATE_RESOURCE));
    }

    if (error?.code === "23503") {
        return new AppError(...errorArgs(ERRORS.INVALID_REFERENCE), null, 422);
    }

    if (error?.code === "23514") {
        return new AppError(...errorArgs(ERRORS.CONSTRAINT_VIOLATION), null, 422);
    }

    if (error?.code === "23502") {
        return new AppError(...errorArgs(ERRORS.MISSING_REQUIRED_VALUE), null, 422);
    }

    if (
        error?.code === "22P02" ||
        error?.code === "22007" ||
        error?.code === "22008"
    ) {
        return new AppError(...errorArgs(ERRORS.INVALID_VALUE), null, 422);
    }

    return error;
};

const mapRequestError = (error) => {
    if (
        error instanceof SyntaxError &&
        error?.status === 400 &&
        error?.type === "entity.parse.failed"
    ) {
        return new AppError(
            ...errorArgs(ERRORS.INVALID_JSON),
            null,
            400,
        );
    }

    return error;
};

export const errorHandler = (error, req, res, _next) => {
    const normalizedError = mapDatabaseError(mapRequestError(error));
    const isKnownError = normalizedError instanceof AppError;
    const status = isKnownError ? normalizedError.statusCode : 500;

    if (!isKnownError) {
        console.error({
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            error: normalizedError,
        });
    }

    return res.status(status).json({
        success: false,
        error: {
            code: isKnownError
                ? normalizedError.code
                : ERRORS.INTERNAL_SERVER_ERROR.code,
            message: isKnownError
                ? normalizedError.message
                : ERRORS.INTERNAL_SERVER_ERROR.message,
            details: isKnownError ? normalizedError.details : null,
        },
    });
};
