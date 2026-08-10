import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";

loadEnvironment("development");

const { default: app } = await import("../../src/app.js");

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
    const response = await fetch(`${baseUrl}/health`);
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
    assert.equal(document.servers[0].url, "/");
    assert.ok(document.paths["/auth/login"]);
    assert.ok(document.paths["/trips"]);
    assert.ok(document.paths["/uploads/presigned-url"]);
    assert.ok(document.paths["/uploads/presigned-url"].get);
    assert.ok(document.paths["/provinces"]);
    assert.ok(document.paths["/provinces/visited"]);
    assert.ok(document.paths["/provinces/{id}"]);
    assert.ok(document.paths["/provinces/{id}/places"]);
    assert.deepEqual(
        document.components.schemas.LoginInput.required,
        ["identifier", "password"],
    );
    assert.equal(document.components.schemas.LoginInput.properties.email, undefined);
    assert.ok(document.components.schemas.TripInput.properties.thumbnailUrl);
    assert.deepEqual(
        document.components.schemas.PresignedUploadInput.required,
        ["fileName", "contentType", "fileSize"],
    );
    assert.ok(document.components.schemas.PresignedImage);
    assert.ok(
        document.paths["/uploads/presigned-url"].get.parameters.some(
            (parameter) => parameter.name === "objectKey" && parameter.required,
        ),
    );
    assert.ok(
        document.paths["/trips"].get.parameters.some(
            (parameter) => parameter.name === "sort",
        ),
    );
    assert.ok(document.components.schemas.ProvinceTracking);
    assert.ok(document.components.schemas.ProvincePlaceTracking);
    assert.ok(
        document.paths["/provinces/{id}/places"].get.parameters.some(
            (parameter) => parameter.name === "visited",
        ),
    );
});

test("invalid JSON returns a client error instead of an internal server error", async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
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
