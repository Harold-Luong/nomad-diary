import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
    getEnvironmentFile,
    getEnvironmentPath,
    getEnvironment,
} from "../../src/config/load-environment.js";

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));

test("environment file selection supports development and production", () => {
    assert.equal(getEnvironmentFile("production"), ".env");
    assert.equal(getEnvironmentFile("development"), ".env.development");
    assert.equal(getEnvironment("development"), "development");
    assert.equal(getEnvironment("production"), "production");
    assert.equal(getEnvironment("staging"), "development");
    assert.equal(getEnvironmentFile("test"), ".env.development");
});

test("environment file paths are resolved from the backend root", () => {
    assert.equal(
        getEnvironmentPath("development"),
        path.join(backendRoot, ".env.development"),
    );
    assert.equal(getEnvironmentPath("production"), path.join(backendRoot, ".env"));
});

test("missing NODE_ENV defaults to development", () => {
    const originalNodeEnvironment = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    try {
        assert.equal(getEnvironment(), "development");
        assert.equal(getEnvironmentFile(), ".env.development");
    } finally {
        if (originalNodeEnvironment === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnvironment;
        }
    }
});

test("only production selects the production environment", () => {
    for (const value of [undefined, "development", "dev", "prod", "test", "staging"]) {
        assert.equal(getEnvironment(value), "development");
    }
});
