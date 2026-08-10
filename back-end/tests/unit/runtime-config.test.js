import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";

loadEnvironment("development");

const {
    assertRuntimeConfiguration,
    getRuntimeConfigurationIssues,
} = await import("../../src/config/env.js");

const validConfiguration = {
    nodeEnv: "production",
    jwtAccessSecret: "a".repeat(32),
    jwtRefreshSecret: "b".repeat(32),
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
            nodeEnv: "development",
            jwtAccessSecret: "replace-with-access-secret",
            jwtRefreshSecret: "replace-with-refresh-secret",
        }),
        [],
    );
});
