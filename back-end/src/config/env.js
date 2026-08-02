const parsePort = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
    if (value === undefined) {
        return fallback;
    }

    return value.toLowerCase() === "true";
};

const splitOrigins = (value) =>
    (value || "http://localhost:5173")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

export const env = Object.freeze({
    nodeEnv: process.env.NODE_ENV || "development",
    port: parsePort(process.env.PORT, 3000),
    corsOrigins: splitOrigins(process.env.CORS_ORIGIN),
    uploadMaxSizeBytes: parsePort(process.env.UPLOAD_MAX_SIZE_MB, 10) * 1024 * 1024,
    database: {
        host: process.env.DATABASE_HOST || process.env.DB_HOST || "127.0.0.1",
        port: parsePort(process.env.DATABASE_PORT || process.env.DB_PORT, 5432),
        database: process.env.DATABASE_NAME || process.env.DB_NAME || "nomad_diary",
        user: process.env.DATABASE_USER || process.env.DB_USER || "postgres",
        password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD,
        ssl: parseBoolean(process.env.DATABASE_SSL),
        max: parsePort(process.env.DATABASE_POOL_MAX, 10),
        idleTimeoutMillis: parsePort(process.env.DATABASE_IDLE_TIMEOUT_MS, 30_000),
        connectionTimeoutMillis: parsePort(
            process.env.DATABASE_CONNECTION_TIMEOUT_MS,
            5_000,
        ),
    },
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
});

export const hasJwtConfiguration = () =>
    Boolean(env.jwtAccessSecret && env.jwtRefreshSecret);
