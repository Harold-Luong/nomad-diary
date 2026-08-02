import { ERRORS, errorArgs } from "../constants/errors.js";
import { AuthenticationError } from "../errors/app-error.js";

export function getAuthenticatedUserId(req) {
    if (!req.auth?.userId) {
        throw new AuthenticationError(...errorArgs(ERRORS.UNAUTHENTICATED));
    }

    return req.auth.userId;
}
