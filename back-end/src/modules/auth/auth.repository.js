import { executeQuery, query } from "../../database/pool.js";

const userColumns = `
    id,
    username,
    email,
    password_hash,
    display_name,
    avatar_url,
    bio,
    created_at,
    updated_at
`;

export async function findActiveUserById(userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ${userColumns}
            FROM users
            WHERE id = $1
              AND is_deleted = false
            LIMIT 1
        `,
        [userId],
    );

    return result.rows[0] ?? null;
}

export async function findActiveUserByIdForUpdate(userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ${userColumns}
            FROM users
            WHERE id = $1
              AND is_deleted = false
            FOR UPDATE
        `,
        [userId],
    );

    return result.rows[0] ?? null;
}

export async function findActiveUserByIdentifier(identifier, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ${userColumns}
            FROM users
            WHERE is_deleted = false
              AND (lower(email) = lower($1) OR lower(username) = lower($1))
            LIMIT 1
        `,
        [identifier],
    );

    return result.rows[0] ?? null;
}

export async function findActiveUserByEmail(email, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT id
            FROM users
            WHERE lower(email) = lower($1)
              AND is_deleted = false
            LIMIT 1
        `,
        [email],
    );

    return result.rows[0] ?? null;
}

export async function findActiveUserByUsername(username, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT id
            FROM users
            WHERE lower(username) = lower($1)
              AND is_deleted = false
            LIMIT 1
        `,
        [username],
    );

    return result.rows[0] ?? null;
}

export async function createUser(
    { username, email, passwordHash, displayName },
    executor = query,
) {
    const result = await executeQuery(
        executor,
        `
            INSERT INTO users (
                username,
                email,
                password_hash,
                display_name
            )
            VALUES ($1, $2, $3, $4)
            RETURNING ${userColumns}
        `,
        [username, email, passwordHash, displayName],
    );

    return result.rows[0];
}

export async function updateActiveUserProfile(userId, profile, executor = query) {
    const fields = [];
    const values = [];

    const setField = (column, value) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
    };

    if (profile.displayName !== undefined) {
        setField("display_name", profile.displayName);
    }

    if (profile.avatarUrl !== undefined) {
        setField("avatar_url", profile.avatarUrl);
    }

    if (profile.bio !== undefined) {
        setField("bio", profile.bio);
    }

    values.push(userId);

    const result = await executeQuery(
        executor,
        `
            UPDATE users
            SET ${fields.join(", ")}, updated_at = now()
            WHERE id = $${values.length}
              AND is_deleted = false
            RETURNING ${userColumns}
        `,
        values,
    );

    return result.rows[0] ?? null;
}

export async function updatePasswordHash(userId, passwordHash, executor = query) {
    const result = await executeQuery(
        executor,
        `
            UPDATE users
            SET password_hash = $2,
                updated_at = now()
            WHERE id = $1
              AND is_deleted = false
            RETURNING ${userColumns}
        `,
        [userId, passwordHash],
    );

    return result.rows[0] ?? null;
}

export async function softDeleteActiveUser(userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            UPDATE users
            SET is_deleted = true,
                updated_at = now()
            WHERE id = $1
              AND is_deleted = false
            RETURNING id
        `,
        [userId],
    );

    return result.rows[0] ?? null;
}

export async function createAuthSession(
    {
        id,
        userId,
        refreshTokenHash,
        expiresAt,
        userAgent = null,
        ipAddress = null,
    },
    executor = query,
) {
    const result = await executeQuery(
        executor,
        `
            INSERT INTO auth_sessions (
                id,
                user_id,
                refresh_token_hash,
                expires_at,
                user_agent,
                ip_address
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, expires_at
        `,
        [id, userId, refreshTokenHash, expiresAt, userAgent, ipAddress],
    );

    return result.rows[0];
}

export async function findActiveAuthSessionById(sessionId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT id, user_id, refresh_token_hash, expires_at, revoked_at
            FROM auth_sessions
            WHERE id = $1
              AND revoked_at IS NULL
              AND expires_at > now()
            LIMIT 1
        `,
        [sessionId],
    );

    return result.rows[0] ?? null;
}

export async function findActiveAuthSessionByIdForUpdate(sessionId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT id, user_id, refresh_token_hash, expires_at, revoked_at
            FROM auth_sessions
            WHERE id = $1
              AND revoked_at IS NULL
              AND expires_at > now()
            FOR UPDATE
        `,
        [sessionId],
    );

    return result.rows[0] ?? null;
}

export async function revokeAuthSession(sessionId, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            UPDATE auth_sessions
            SET revoked_at = now()
            WHERE id = $1
              AND user_id = $2
              AND revoked_at IS NULL
            RETURNING id
        `,
        [sessionId, userId],
    );

    return result.rows[0] ?? null;
}

export async function revokeAllAuthSessionsForUser(userId, executor = query) {
    await executeQuery(
        executor,
        `
            UPDATE auth_sessions
            SET revoked_at = now()
            WHERE user_id = $1
              AND revoked_at IS NULL
        `,
        [userId],
    );
}
