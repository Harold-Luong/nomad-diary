import assert from "node:assert/strict";
import test from "node:test";

import { createHandler, handler } from "../../src/handlers/query.js";

function httpEvent(path, { method = "GET", requestId = "request-123" } = {}) {
    return {
        rawPath: path,
        requestContext: {
            requestId,
            http: { method, path },
        },
    };
}

test("health route returns the service status", async () => {
    const response = await handler();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
        data: {
            service: "location-catalog",
            status: "ok",
        },
    });
});

test("province route returns public province fields", async () => {
    const repository = {
        async listProvinces() {
            return [{ code: "01", name: "Thành phố Hà Nội" }];
        },
    };
    const queryHandler = createHandler({ repository });

    const response = await queryHandler(httpEvent("/v1/provinces"));

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
        data: [{ code: "01", name: "Thành phố Hà Nội" }],
        meta: { nextCursor: null },
    });
});

test("ward route queries wards using the province code", async () => {
    let receivedProvinceCode;
    const repository = {
        async listWards(provinceCode) {
            receivedProvinceCode = provinceCode;
            return [{ code: "00004", provinceCode: "01", name: "Phường Ba Đình" }];
        },
    };
    const queryHandler = createHandler({ repository });

    const response = await queryHandler(httpEvent("/v1/provinces/01/wards"));

    assert.equal(receivedProvinceCode, "01");
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
        data: [{ code: "00004", provinceCode: "01", name: "Phường Ba Đình" }],
        meta: { nextCursor: null },
    });
});

test("ward route rejects an invalid province code", async () => {
    const queryHandler = createHandler({ repository: {} });

    const response = await queryHandler(httpEvent("/v1/provinces/1/wards"));

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), {
        error: {
            code: "VALIDATION_ERROR",
            message: "provinceCode must contain 2 digits",
            requestId: "request-123",
        },
    });
});

test("repository failures return a safe internal error", async () => {
    const repository = {
        async listProvinces() {
            throw Object.assign(new Error("Access denied for secret resource"), {
                name: "AccessDeniedException",
            });
        },
    };
    const queryHandler = createHandler({ repository });

    const originalConsoleError = console.error;
    console.error = () => { };
    const response = await queryHandler(httpEvent("/v1/provinces"));
    console.error = originalConsoleError;

    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), {
        error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error",
            requestId: "request-123",
        },
    });
});
