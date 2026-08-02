import rateLimit from "express-rate-limit";

import { ERRORS } from "../shared/constants/errors.js";

export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: ERRORS.RATE_LIMITED.code,
            message: ERRORS.RATE_LIMITED.message,
            details: null,
        },
    },
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: ERRORS.AUTH_RATE_LIMITED.code,
            message: ERRORS.AUTH_RATE_LIMITED.message,
            details: null,
        },
    },
});
