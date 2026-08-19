import { env } from "../../config/env.js";

export const REFRESH_TOKEN_COOKIE = "nomad_diary_refresh_token";

const cookieOptions = () => ({
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict",
    path: "/auth",
});

export function readRefreshTokenCookie(req) {
    const cookieHeader = req.get("cookie");
    if (!cookieHeader) return null;

    for (const entry of cookieHeader.split(";")) {
        const separator = entry.indexOf("=");
        if (separator < 0) continue;

        const name = entry.slice(0, separator).trim();
        if (name === REFRESH_TOKEN_COOKIE) {
            try {
                return decodeURIComponent(entry.slice(separator + 1).trim());
            } catch {
                return null;
            }
        }
    }

    return null;
}

export function setRefreshTokenCookie(res, token, expiresAt) {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
        ...cookieOptions(),
        expires: expiresAt,
    });
}

export function clearRefreshTokenCookie(res) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions());
}
