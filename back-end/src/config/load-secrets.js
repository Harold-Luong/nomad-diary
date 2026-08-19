import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import { AWS_REGION } from "./constants.js";

const SECRET_NAME = "ec2-db-env";

export const SECRET_ENVIRONMENT_VARIABLES = Object.freeze([
    "DATABASE_HOST",
    "DATABASE_NAME",
    "DATABASE_PASSWORD",
    "DATABASE_USER",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_ACCESS_EXPIRES_IN",
    "JWT_REFRESH_EXPIRES_IN",
    "CORS_ORIGIN",
    "AWS_CLOUDFRONT_IMAGE_BASE_URL",
    "AWS_S3_IMAGE_BUCKET",
]);

function parseSecret(secretString) {
    let secret;

    try {
        secret = JSON.parse(secretString);
    } catch (cause) {
        const error = new Error("Unable to parse AWS secret as JSON.", { cause });
        error.code = "SECRET_VALUE_INVALID";
        throw error;
    }

    const missing = SECRET_ENVIRONMENT_VARIABLES.filter((name) =>
        typeof secret?.[name] !== "string" || !secret[name].trim()
    );

    if (missing.length) {
        const error = new Error(`AWS secret is missing required values: ${missing.join(", ")}.`);
        error.code = "SECRET_VALUE_INVALID";
        throw error;
    }

    return Object.fromEntries(
        SECRET_ENVIRONMENT_VARIABLES.map((name) => [name, secret[name]]),
    );
}

export async function getSecrets({
    secretId = SECRET_NAME,
    client = new SecretsManagerClient({ region: AWS_REGION }),
} = {}) {
    let response;

    try {
        response = await client.send(new GetSecretValueCommand({
            SecretId: secretId,
            VersionStage: "AWSCURRENT",
        }));
    } catch (cause) {
        const error = new Error(
            `Unable to load runtime configuration from AWS secret ${secretId}.`,
            { cause },
        );
        error.code = "AWS_SECRET_LOAD_FAILED";
        throw error;
    }

    return parseSecret(response.SecretString);
}
