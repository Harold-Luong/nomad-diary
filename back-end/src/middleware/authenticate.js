import jwt from "jsonwebtoken";

import { env, hasJwtConfiguration } from "../config/env.js";
import { query } from "../database/pool.js";
import { JWT_TOKEN_TYPE } from "../shared/constants/domain.js";
import { ERRORS, errorArgs } from "../shared/constants/errors.js";
import { AuthenticationError, ConfigurationError } from "../shared/errors/app-error.js";

export const authenticate = async (req, _res, next) => {
    if (!hasJwtConfiguration()) {
        return next(
            new ConfigurationError(
                ...errorArgs(ERRORS.JWT_NOT_CONFIGURED),
            ),
        );
    }

    const authorization = req.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

    if (!token) {
        return next(
            new AuthenticationError(...errorArgs(ERRORS.MISSING_ACCESS_TOKEN)),
        );
    }

    let payload;

    try {
        payload = jwt.verify(token, env.jwtAccessSecret);
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return next(error);
        }

        return next(
            new AuthenticationError(...errorArgs(ERRORS.INVALID_ACCESS_TOKEN)),
        );
    }

    if (payload.type !== JWT_TOKEN_TYPE.ACCESS || !payload.sub || !payload.sid) {
        return next(
            new AuthenticationError(...errorArgs(ERRORS.INVALID_ACCESS_TOKEN)),
        );
    }

    try {
        const sessionResult = await query(
            `
                SELECT 1
                FROM auth_sessions AS session
                JOIN users AS app_user ON app_user.id = session.user_id
                WHERE session.id = $1
                  AND session.user_id = $2
                  AND session.revoked_at IS NULL
                  AND session.expires_at > now()
                  AND app_user.is_deleted = false
                LIMIT 1
            `,
            [String(payload.sid), String(payload.sub)],
        );

        if (sessionResult.rowCount !== 1) {
            return next(
                new AuthenticationError(...errorArgs(ERRORS.INVALID_ACCESS_TOKEN)),
            );
        }
    } catch (error) {
        return next(error);
    }

    req.auth = { userId: String(payload.sub), sessionId: String(payload.sid) };
    return next();
};
