import bcrypt from "bcryptjs";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

import { env, hasJwtConfiguration } from "../../config/env.js";
import { isUniqueViolation } from "../../database/postgres-errors.js";
import { withTransaction } from "../../database/transaction.js";
import {
    AUTH_SCHEME,
    JWT_ALGORITHM,
    JWT_TOKEN_TYPE,
} from "../../shared/constants/domain.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import {
    AuthenticationError,
    ConfigurationError,
    ConflictError,
    ValidationError,
} from "../../shared/errors/app-error.js";
import * as authRepository from "./auth.repository.js";

const PASSWORD_SALT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH =
    "$2b$12$0VyxDfjkSeE9dPUZg187ruF2ewzbUi8nst8ro6CjSiQ/HWxjxT/RS";

function ensureJwtConfiguration() {
    if (!hasJwtConfiguration()) {
        throw new ConfigurationError(
            ...errorArgs(ERRORS.JWT_NOT_CONFIGURED),
        );
    }
}

function serializeDate(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }

    return value ?? null;
}

function toPublicUser(user) {
    return {
        id: String(user.id),
        username: user.username,
        email: user.email,
        displayName: user.display_name ?? null,
        avatarUrl: user.avatar_url ?? null,
        bio: user.bio ?? null,
        createdAt: serializeDate(user.created_at),
        updatedAt: serializeDate(user.updated_at),
    };
}

function invalidCredentialsError() {
    return new AuthenticationError(
        ...errorArgs(ERRORS.INVALID_CREDENTIALS),
    );
}

function invalidRefreshTokenError() {
    return new AuthenticationError(
        ...errorArgs(ERRORS.INVALID_REFRESH_TOKEN),
    );
}

function unauthenticatedError() {
    return new AuthenticationError(...errorArgs(ERRORS.UNAUTHENTICATED));
}

function createRefreshTokenHash(refreshToken) {
    return createHash("sha256").update(refreshToken).digest("hex");
}

function tokenHashesMatch(expectedHash, refreshToken) {
    const expected = Buffer.from(expectedHash, "utf8");
    const actual = Buffer.from(createRefreshTokenHash(refreshToken), "utf8");

    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signAccessToken(userId, sessionId) {
    return jwt.sign(
        {
            sub: String(userId),
            sid: sessionId,
            type: JWT_TOKEN_TYPE.ACCESS,
        },
        env.jwtAccessSecret,
        { algorithm: JWT_ALGORITHM, expiresIn: env.jwtAccessExpiresIn },
    );
}

function signRefreshToken(userId, sessionId) {
    return jwt.sign(
        {
            sub: String(userId),
            sid: sessionId,
            type: JWT_TOKEN_TYPE.REFRESH,
        },
        env.jwtRefreshSecret,
        { algorithm: JWT_ALGORITHM, expiresIn: env.jwtRefreshExpiresIn },
    );
}

function getTokenExpiry(token) {
    const payload = jwt.decode(token);

    if (!payload || typeof payload === "string" || typeof payload.exp !== "number") {
        throw new Error("Refresh token must include an expiry");
    }

    return new Date(payload.exp * 1000);
}

function parseRefreshToken(refreshToken) {
    try {
        const payload = jwt.verify(refreshToken, env.jwtRefreshSecret, {
            algorithms: [JWT_ALGORITHM],
        });

        if (
            !payload ||
            typeof payload === "string" ||
            payload.type !== JWT_TOKEN_TYPE.REFRESH ||
            typeof payload.sub !== "string" ||
            typeof payload.sid !== "string"
        ) {
            throw invalidRefreshTokenError();
        }

        return {
            userId: payload.sub,
            sessionId: payload.sid,
        };
    } catch (error) {
        if (error instanceof AuthenticationError) {
            throw error;
        }

        if (
            error?.name === "JsonWebTokenError" ||
            error?.name === "TokenExpiredError" ||
            error?.name === "NotBeforeError"
        ) {
            throw invalidRefreshTokenError();
        }

        throw error;
    }
}

async function passwordMatches(password, passwordHash) {
    if (!passwordHash) {
        return false;
    }

    try {
        return await bcrypt.compare(password, passwordHash);
    } catch {
        return false;
    }
}

async function issueSessionTokens(user, requestInfo, executor) {
    ensureJwtConfiguration();

    const sessionId = randomUUID();
    const refreshToken = signRefreshToken(user.id, sessionId);

    await authRepository.createAuthSession(
        {
            id: sessionId,
            userId: user.id,
            refreshTokenHash: createRefreshTokenHash(refreshToken),
            expiresAt: getTokenExpiry(refreshToken),
            userAgent: requestInfo.userAgent,
            ipAddress: requestInfo.ipAddress,
        },
        executor,
    );

    return {
        user: toPublicUser(user),
        accessToken: signAccessToken(user.id, sessionId),
        refreshToken,
        tokenType: AUTH_SCHEME.BEARER,
        accessTokenExpiresIn: env.jwtAccessExpiresIn,
        refreshTokenExpiresIn: env.jwtRefreshExpiresIn,
    };
}

function duplicateUserError(error) {
    const constraint = error?.constraint ?? "";

    if (constraint.includes("email")) {
        return new ConflictError(...errorArgs(ERRORS.EMAIL_ALREADY_EXISTS));
    }

    return new ConflictError(...errorArgs(ERRORS.USERNAME_ALREADY_EXISTS));
}

export async function register(input, requestInfo) {
    ensureJwtConfiguration();

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

    try {
        return await withTransaction(async (client) => {
            const [existingUsername, existingEmail] = await Promise.all([
                authRepository.findActiveUserByIdentifier(input.username, client),
                authRepository.findActiveUserByIdentifier(input.email, client),
            ]);

            if (existingUsername) {
                throw new ConflictError(
                    ...errorArgs(ERRORS.USERNAME_ALREADY_EXISTS),
                );
            }

            if (existingEmail) {
                throw new ConflictError(...errorArgs(ERRORS.EMAIL_ALREADY_EXISTS));
            }

            const user = await authRepository.createUser(
                {
                    username: input.username,
                    email: input.email,
                    passwordHash,
                    displayName: input.displayName ?? input.username,
                },
                client,
            );

            return issueSessionTokens(user, requestInfo, client);
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw duplicateUserError(error);
        }

        throw error;
    }
}

export async function login(input, requestInfo) {
    ensureJwtConfiguration();

    const user = await authRepository.findActiveUserByIdentifier(input.identifier);

    const passwordHash = user?.password_hash ?? DUMMY_PASSWORD_HASH;

    if (!(await passwordMatches(input.password, passwordHash)) || !user) {
        throw invalidCredentialsError();
    }

    return withTransaction((client) => issueSessionTokens(user, requestInfo, client));
}

export async function refreshSession(refreshToken, requestInfo) {
    ensureJwtConfiguration();

    const { userId, sessionId } = parseRefreshToken(refreshToken);

    return withTransaction(async (client) => {
        const session = await authRepository.findActiveAuthSessionByIdForUpdate(
            sessionId,
            client,
        );

        if (
            !session ||
            String(session.user_id) !== userId ||
            !tokenHashesMatch(session.refresh_token_hash, refreshToken)
        ) {
            throw invalidRefreshTokenError();
        }

        const user = await authRepository.findActiveUserById(userId, client);

        if (!user) {
            throw invalidRefreshTokenError();
        }

        await authRepository.revokeAuthSession(sessionId, userId, client);

        return issueSessionTokens(user, requestInfo, client);
    });
}

export async function logout(userId, sessionId) {
    if (sessionId) {
        await authRepository.revokeAuthSession(sessionId, userId);
    }
}

export async function getCurrentUser(userId) {
    const user = await authRepository.findActiveUserById(userId);

    if (!user) {
        throw unauthenticatedError();
    }

    return toPublicUser(user);
}

export async function updateCurrentUser(userId, profile) {
    const user = await authRepository.updateActiveUserProfile(userId, profile);

    if (!user) {
        throw unauthenticatedError();
    }

    return toPublicUser(user);
}

export async function changePassword(userId, input, requestInfo) {
    assertPasswordCanBeChanged(input.currentPassword, input.newPassword);
    ensureJwtConfiguration();

    const passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_SALT_ROUNDS);

    return withTransaction(async (client) => {
        const user = await authRepository.findActiveUserByIdForUpdate(userId, client);

        if (!user) {
            throw unauthenticatedError();
        }

        if (!(await passwordMatches(input.currentPassword, user.password_hash))) {
            throw invalidCredentialsError();
        }

        const updatedUser = await authRepository.updatePasswordHash(userId, passwordHash, client);

        if (!updatedUser) {
            throw unauthenticatedError();
        }

        await authRepository.revokeAllAuthSessionsForUser(userId, client);

        return issueSessionTokens(updatedUser, requestInfo, client);
    });
}

export async function deleteCurrentUser(userId, password) {
    await withTransaction(async (client) => {
        const user = await authRepository.findActiveUserByIdForUpdate(userId, client);

        if (!user) {
            throw unauthenticatedError();
        }

        if (!(await passwordMatches(password, user.password_hash))) {
            throw invalidCredentialsError();
        }

        await authRepository.revokeAllAuthSessionsForUser(userId, client);

        const deletedUser = await authRepository.softDeleteActiveUser(userId, client);

        if (!deletedUser) {
            throw unauthenticatedError();
        }
    });
}

export function assertPasswordCanBeChanged(currentPassword, newPassword) {
    if (currentPassword === newPassword) {
        throw new ValidationError(
            ...errorArgs(ERRORS.PASSWORD_REUSE),
        );
    }
}
