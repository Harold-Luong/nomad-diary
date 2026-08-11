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

const splitOrigins = (value = "") =>
    value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

const JWT_MIN_SECRET_BYTES = 32;
const SECRET_PLACEHOLDER_PREFIX = "replace-with-";

export const env = Object.freeze({
    nodeEnv: process.env.NODE_ENV || "development",
    port: parsePort(process.env.PORT, 3000),
    corsOrigins: splitOrigins(process.env.CORS_ORIGIN),
    database: {
        host: process.env.DATABASE_HOST || "127.0.0.1",
        port: parsePort(process.env.DATABASE_PORT || 5432),
        database: process.env.DATABASE_NAME || "nomad_diary",
        user: process.env.DATABASE_USER || "postgres",
        password: process.env.DATABASE_PASSWORD,
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
    s3: {
        region: process.env.AWS_REGION,
        bucketName: process.env.AWS_S3_IMAGE_BUCKET,
        uploadMaxSizeMb: parsePort(process.env.UPLOAD_MAX_SIZE_MB, 10),
    },
    cloudFront: {
        imageBaseUrl: process.env.AWS_CLOUDFRONT_IMAGE_BASE_URL,
    },
});

export const hasJwtConfiguration = () =>
    Boolean(env.jwtAccessSecret && env.jwtRefreshSecret);

export function getRuntimeConfigurationIssues(configuration = env) {
    const issues = [];
    const requiresStrongSecrets = configuration.nodeEnv === "production";
    const secrets = [
        ["JWT_ACCESS_SECRET", configuration.jwtAccessSecret],
        ["JWT_REFRESH_SECRET", configuration.jwtRefreshSecret],
    ];

    for (const [name, value] of secrets) {
        if (!value) {
            issues.push(`${name} is required`);
        } else if (requiresStrongSecrets && value.startsWith(SECRET_PLACEHOLDER_PREFIX)) {
            issues.push(`${name} must not use the example placeholder`);
        } else if (
            requiresStrongSecrets &&
            Buffer.byteLength(value, "utf8") < JWT_MIN_SECRET_BYTES
        ) {
            issues.push(`${name} must contain at least ${JWT_MIN_SECRET_BYTES} UTF-8 bytes`);
        }
    }

    if (
        configuration.jwtAccessSecret &&
        configuration.jwtAccessSecret === configuration.jwtRefreshSecret
    ) {
        issues.push("JWT access and refresh secrets must be different");
    }

    return issues;
}

export function assertRuntimeConfiguration(configuration = env) {
    const issues = getRuntimeConfigurationIssues(configuration);

    if (issues.length === 0) {
        return;
    }

    const error = new Error(`Invalid runtime configuration: ${issues.join("; ")}`);
    error.code = "INVALID_RUNTIME_CONFIGURATION";
    throw error;
}
