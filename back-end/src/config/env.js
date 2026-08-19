import { AWS_REGION } from "./constants.js";

const JWT_MIN_SECRET_BYTES = 32;

const integer = (value) => Number(value);

const boolean = (value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
};

const splitOrigins = (value) =>
    typeof value === "string"
        ? value.split(",").map((origin) => origin.trim()).filter(Boolean)
        : [];

export const env = Object.freeze({
    nodeEnv: process.env.NODE_ENV,
    port: integer(process.env.PORT),
    corsOrigins: splitOrigins(process.env.CORS_ORIGIN),
    database: {
        host: process.env.DATABASE_HOST,
        port: integer(process.env.DATABASE_PORT),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        ssl: boolean(process.env.DATABASE_SSL),
        max: integer(process.env.DATABASE_POOL_MAX),
        idleTimeoutMillis: integer(process.env.DATABASE_IDLE_TIMEOUT_MS),
        connectionTimeoutMillis: integer(process.env.DATABASE_CONNECTION_TIMEOUT_MS),
    },
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    s3: {
        region: AWS_REGION,
        bucketName: process.env.AWS_S3_IMAGE_BUCKET,
        uploadMaxSizeMb: integer(process.env.UPLOAD_MAX_SIZE_MB),
    },
    cloudFront: {
        imageBaseUrl: process.env.AWS_CLOUDFRONT_IMAGE_BASE_URL,
    },
});

export const hasJwtConfiguration = (configuration = env) =>
    Boolean(configuration.jwtAccessSecret && configuration.jwtRefreshSecret);

export function getRuntimeConfigurationIssues(configuration = env) {
    const issues = [];
    const requiredValues = [
        ["NODE_ENV", configuration.nodeEnv],
        ["DATABASE_HOST", configuration.database?.host],
        ["DATABASE_NAME", configuration.database?.database],
        ["DATABASE_USER", configuration.database?.user],
        ["DATABASE_PASSWORD", configuration.database?.password],
        ["JWT_ACCESS_EXPIRES_IN", configuration.jwtAccessExpiresIn],
        ["JWT_REFRESH_EXPIRES_IN", configuration.jwtRefreshExpiresIn],
        ["CORS_ORIGIN", configuration.corsOrigins?.length],
        ["AWS_S3_IMAGE_BUCKET", configuration.s3?.bucketName],
        ["AWS_CLOUDFRONT_IMAGE_BASE_URL", configuration.cloudFront?.imageBaseUrl],
    ];
    const positiveIntegers = [
        ["PORT", configuration.port],
        ["DATABASE_PORT", configuration.database?.port],
        ["DATABASE_POOL_MAX", configuration.database?.max],
        ["DATABASE_IDLE_TIMEOUT_MS", configuration.database?.idleTimeoutMillis],
        ["DATABASE_CONNECTION_TIMEOUT_MS", configuration.database?.connectionTimeoutMillis],
        ["UPLOAD_MAX_SIZE_MB", configuration.s3?.uploadMaxSizeMb],
    ];
    const jwtSecrets = [
        ["JWT_ACCESS_SECRET", configuration.jwtAccessSecret],
        ["JWT_REFRESH_SECRET", configuration.jwtRefreshSecret],
    ];

    for (const [name, value] of requiredValues) {
        if (!value) issues.push(`${name} is required`);
    }

    for (const [name, value] of positiveIntegers) {
        if (!Number.isInteger(value) || value <= 0) {
            issues.push(`${name} must be a positive integer`);
        }
    }

    if (typeof configuration.database?.ssl !== "boolean") {
        issues.push("DATABASE_SSL must be true or false");
    }

    for (const [name, value] of jwtSecrets) {
        if (!value) {
            issues.push(`${name} is required`);
        } else if (configuration.nodeEnv === "production") {
            if (value.startsWith("replace-with-")) {
                issues.push(`${name} must not use the example placeholder`);
            } else if (Buffer.byteLength(value, "utf8") < JWT_MIN_SECRET_BYTES) {
                issues.push(`${name} must contain at least ${JWT_MIN_SECRET_BYTES} UTF-8 bytes`);
            }
        }
    }

    if (
        configuration.jwtAccessSecret
        && configuration.jwtAccessSecret === configuration.jwtRefreshSecret
    ) {
        issues.push("JWT access and refresh secrets must be different");
    }

    return issues;
}

export function assertRuntimeConfiguration(configuration = env) {
    const issues = getRuntimeConfigurationIssues(configuration);
    if (!issues.length) return;

    const error = new Error(`Invalid runtime configuration: ${issues.join("; ")}`);
    error.code = "INVALID_RUNTIME_CONFIGURATION";
    throw error;
}
