import { AuthenticationError } from "../../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { sendNoContent, sendSuccess } from "../../shared/http/response.js";
import * as authService from "./auth.service.js";

function getRequestInfo(req) {
    return {
        userAgent: req.get("user-agent")?.slice(0, 1000) || null,
        ipAddress: req.ip?.slice(0, 64) || null,
    };
}

function getAuthenticatedUserId(req) {
    if (!req.auth?.userId) {
        throw new AuthenticationError(...errorArgs(ERRORS.UNAUTHENTICATED));
    }

    return req.auth.userId;
}

export const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, getRequestInfo(req));
    return sendSuccess(res, result, { status: 201 });
});

export const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, getRequestInfo(req));
    return sendSuccess(res, result);
});

export const refreshToken = asyncHandler(async (req, res) => {
    const result = await authService.refreshSession(req.body.refreshToken, getRequestInfo(req));
    return sendSuccess(res, result);
});

export const logout = asyncHandler(async (req, res) => {
    await authService.logout(getAuthenticatedUserId(req), req.auth.sessionId);
    return sendNoContent(res);
});

export const getMe = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(getAuthenticatedUserId(req));
    return sendSuccess(res, user);
});

export const updateMe = asyncHandler(async (req, res) => {
    const user = await authService.updateCurrentUser(getAuthenticatedUserId(req), req.body);
    return sendSuccess(res, user);
});

export const changePassword = asyncHandler(async (req, res) => {
    const result = await authService.changePassword(
        getAuthenticatedUserId(req),
        req.body,
        getRequestInfo(req),
    );

    return sendSuccess(res, result);
});

export const deleteAccount = asyncHandler(async (req, res) => {
    await authService.deleteCurrentUser(getAuthenticatedUserId(req), req.body.password);
    return sendNoContent(res);
});
