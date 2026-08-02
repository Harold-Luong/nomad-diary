import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import app from "../../src/app.js";

let server;
let baseUrl;

before(
    () =>
        new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", () => {
                const { port } = server.address();
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        }),
);

after(
    () =>
        new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        }),
);

test("health endpoint returns the standard success envelope", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "ok");
});

test("Swagger exposes an OpenAPI document", async () => {
    const response = await fetch(`${baseUrl}/api-docs.json`);
    const document = await response.json();

    assert.equal(response.status, 200);
    assert.equal(document.openapi, "3.0.3");
    assert.ok(document.paths["/api/auth/login"]);
    assert.ok(document.paths["/api/trips"]);
    assert.deepEqual(
        document.components.schemas.LoginInput.required,
        ["identifier", "password"],
    );
    assert.equal(document.components.schemas.LoginInput.properties.email, undefined);
});

test("invalid JSON returns a client error instead of an internal server error", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"identifier":"nomad@example.com",}',
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_JSON");
});

test("disallowed CORS origins return an explicit 403 error", async () => {
    const response = await fetch(`${baseUrl}/`, {
        headers: { origin: "https://not-allowed.example" },
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "CORS_ORIGIN_NOT_ALLOWED");
});
