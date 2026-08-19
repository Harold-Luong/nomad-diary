import { asyncHandler } from "../../shared/http/async-handler.js";
import { getAuthenticatedUserId } from "../../shared/http/auth-context.js";
import { sendNoContent, sendSuccess } from "../../shared/http/response.js";
import * as authService from "./auth.service.js";
import {
    clearRefreshTokenCookie,
    readRefreshTokenCookie,
    setRefreshTokenCookie,
} from "./auth-cookie.js";

function getRequestInfo(req) {
    return {
        userAgent: req.get("user-agent")?.slice(0, 1000) || null,
        ipAddress: req.ip?.slice(0, 64) || null,
    };
}

function sendSession(res, result, options) {
    const { refreshToken, refreshTokenExpiresAt, ...publicSession } = result;
    setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresAt);
    return sendSuccess(res, publicSession, options);
}

export const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, getRequestInfo(req));
    return sendSession(res, result, { status: 201 });
});

export const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, getRequestInfo(req));
    return sendSession(res, result);
});

export const refreshToken = asyncHandler(async (req, res) => {
    const result = await authService.refreshSession(
        readRefreshTokenCookie(req),
        getRequestInfo(req),
    );
    return sendSession(res, result);
});

export const logout = asyncHandler(async (req, res) => {
    await authService.logout(getAuthenticatedUserId(req), req.auth.sessionId);
    clearRefreshTokenCookie(res);
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

    return sendSession(res, result);
});

export const deleteAccount = asyncHandler(async (req, res) => {
    await authService.deleteCurrentUser(getAuthenticatedUserId(req), req.body.password);
    clearRefreshTokenCookie(res);
    return sendNoContent(res);
});
