import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";

loadEnvironment("development");

const { createPresignedUploadSchema } = await import(
    "../../src/modules/uploads/uploads.schema.js"
);

test("presigned upload metadata accepts supported images and defaults purpose", () => {
    assert.deepEqual(
        createPresignedUploadSchema.parse({
            fileName: " da-lat.jpg ",
            contentType: "image/jpeg",
            fileSize: 1024,
        }),
        {
            fileName: "da-lat.jpg",
            contentType: "image/jpeg",
            fileSize: 1024,
            purpose: "image",
        },
    );
});

test("presigned upload metadata rejects unsupported and oversized files", () => {
    assert.equal(
        createPresignedUploadSchema.safeParse({
            fileName: "script.svg",
            contentType: "image/svg+xml",
            fileSize: 1024,
        }).success,
        false,
    );
    assert.equal(
        createPresignedUploadSchema.safeParse({
            fileName: "huge.jpg",
            contentType: "image/jpeg",
            fileSize: (10 * 1024 * 1024) + 1,
        }).success,
        false,
    );
});
