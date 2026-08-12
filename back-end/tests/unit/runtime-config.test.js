import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";
import { AWS_REGION } from "../../src/config/constants.js";

await loadEnvironment("development");

const envModule = await import("../../src/config/env.js");
const { assertRuntimeConfiguration, getRuntimeConfigurationIssues } = envModule;

const validConfiguration = {
    nodeEnv: "production",
    port: 3000,
    corsOrigins: ["https://nomad-diary.site"],
    database: {
        host: "database.internal",
        port: 5432,
        database: "nomad_diary",
        user: "nomad_diary",
        password: "database-password",
        ssl: true,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
    },
    jwtAccessSecret: "a".repeat(32),
    jwtRefreshSecret: "b".repeat(32),
    jwtAccessExpiresIn: "15m",
    jwtRefreshExpiresIn: "30d",
    s3: {
        region: AWS_REGION,
        bucketName: "nomad-diary-img",
        uploadMaxSizeMb: 10,
    },
    cloudFront: {
        imageBaseUrl: "https://img.nomad-diary.site",
    },
};

test("runtime configuration accepts distinct non-placeholder JWT secrets", () => {
    assert.deepEqual(getRuntimeConfigurationIssues(validConfiguration), []);
    assert.doesNotThrow(() => assertRuntimeConfiguration(validConfiguration));
});

test("runtime configuration rejects missing, placeholder, short, and reused secrets", () => {
    const issues = getRuntimeConfigurationIssues({
        nodeEnv: "production",
        jwtAccessSecret: "replace-with-a-secret",
        jwtRefreshSecret: "replace-with-a-secret",
    });

    assert.ok(issues.some((issue) => issue.includes("placeholder")));
    assert.ok(issues.some((issue) => issue.includes("must be different")));
    assert.throws(
        () => assertRuntimeConfiguration({
            nodeEnv: "production",
            jwtAccessSecret: "short",
            jwtRefreshSecret: null,
        }),
        (error) => error.code === "INVALID_RUNTIME_CONFIGURATION",
    );
});

test("development permits example-length secrets but still requires distinct values", () => {
    assert.deepEqual(
        getRuntimeConfigurationIssues({
            ...validConfiguration,
            nodeEnv: "development",
            jwtAccessSecret: "replace-with-access-secret",
            jwtRefreshSecret: "replace-with-refresh-secret",
        }),
        [],
    );
});

test("all environments require complete configuration", () => {
    const issues = getRuntimeConfigurationIssues({
        ...validConfiguration,
        nodeEnv: "development",
        port: Number.NaN,
        corsOrigins: [],
        database: {
            ...validConfiguration.database,
            password: "",
            ssl: undefined,
        },
        s3: { bucketName: "", uploadMaxSizeMb: 0 },
        cloudFront: { imageBaseUrl: "" },
    });

    for (const name of [
        "DATABASE_PASSWORD",
        "CORS_ORIGIN",
        "AWS_S3_IMAGE_BUCKET",
        "AWS_CLOUDFRONT_IMAGE_BASE_URL",
    ]) {
        assert.ok(issues.includes(`${name} is required`));
    }
    assert.ok(issues.includes("PORT must be a positive integer"));
    assert.ok(issues.includes("UPLOAD_MAX_SIZE_MB must be a positive integer"));
    assert.ok(issues.includes("DATABASE_SSL must be true or false"));
});

test("env is created once when the module is imported", async () => {
    const secondImport = await import("../../src/config/env.js");

    assert.equal(secondImport.env, envModule.env);
    assert.equal(envModule.env.s3.region, AWS_REGION);
    assert.equal(envModule.hasJwtConfiguration(), true);
});
