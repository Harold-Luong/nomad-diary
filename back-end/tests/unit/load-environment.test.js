import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
    getEnvironmentFile,
    getEnvironmentPath,
    getNodeEnvironment,
} from "../../src/config/load-environment.js";

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));

test("environment file selection supports development and production", () => {
    assert.equal(getEnvironmentFile("production"), ".env");
    assert.equal(getEnvironmentFile("development"), ".env.example");
    assert.equal(getNodeEnvironment("development"), "development");
    assert.equal(getNodeEnvironment("production"), "production");
});

test("environment file paths are resolved from the backend root", () => {
    assert.equal(
        getEnvironmentPath("development"),
        path.join(backendRoot, ".env.example"),
    );
    assert.equal(getEnvironmentPath("production"), path.join(backendRoot, ".env"));
});

test("missing NODE_ENV defaults to development", () => {
    const originalNodeEnvironment = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    try {
        assert.equal(getNodeEnvironment(), "development");
        assert.equal(getEnvironmentFile(), ".env.example");
    } finally {
        if (originalNodeEnvironment === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnvironment;
        }
    }
});

test("unsupported NODE_ENV values fail fast", () => {
    assert.throws(
        () => getEnvironmentFile("staging"),
        /Use "development" or "production"/,
    );
});
