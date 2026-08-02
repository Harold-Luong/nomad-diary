import { NotFoundError } from "../shared/errors/app-error.js";
import { ERRORS } from "../shared/constants/errors.js";

export const notFound = (req, _res, next) =>
    next(
        new NotFoundError(
            ERRORS.ROUTE_NOT_FOUND.code,
            `${ERRORS.ROUTE_NOT_FOUND.message}: ${req.method} ${req.originalUrl}`,
        ),
    );
