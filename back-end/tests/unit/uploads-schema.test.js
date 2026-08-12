import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";

await loadEnvironment("development");

const {
    avatarObjectKeySchema,
    createPresignedUploadSchema,
    imageObjectKeySchema,
    tripCoverObjectKeySchema,
} = await import("../../src/modules/uploads/uploads.schema.js");

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
            purpose: "images",
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

test("image object keys preserve their upload purpose", () => {
    const avatarKey =
        "users/42/avatar/2bb95131-6918-4d70-813a-33f916edb781.webp";
    const tripCoverKey =
        "users/42/trip-cover/2bb95131-6918-4d70-813a-33f916edb781.jpg";
    const avifImageKey =
        "users/42/images/2bb95131-6918-4d70-813a-33f916edb781.avif";

    assert.equal(avatarObjectKeySchema.parse(avatarKey), avatarKey);
    assert.equal(tripCoverObjectKeySchema.parse(tripCoverKey), tripCoverKey);
    assert.equal(imageObjectKeySchema.parse(avifImageKey), avifImageKey);
    assert.equal(avatarObjectKeySchema.safeParse(tripCoverKey).success, false);
    assert.equal(tripCoverObjectKeySchema.safeParse(avatarKey).success, false);
});
