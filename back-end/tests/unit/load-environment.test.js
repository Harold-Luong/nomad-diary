import assert from "node:assert/strict";
import test from "node:test";

import { getEnvironmentFile } from "../../src/config/load-environment.js";

test("environment file selection uses .env only for production", () => {
    assert.equal(getEnvironmentFile("production"), ".env");
    assert.equal(getEnvironmentFile("development"), ".env.example");
    assert.equal(getEnvironmentFile(undefined), ".env.example");
});
