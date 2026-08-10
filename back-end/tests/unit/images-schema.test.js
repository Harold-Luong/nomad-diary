import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";

loadEnvironment("development");

const {
    createImageSchema,
    listImagesQuerySchema,
    updateImageSchema,
} = await import("../../src/modules/images/images.schema.js");

const imageObjectKey =
    "users/42/images/2bb95131-6918-4d70-813a-33f916edb781.avif";

test("image creation stores upload object keys and applies metadata defaults", () => {
    assert.deepEqual(
        createImageSchema.parse({
            tripId: "7",
            imageObjectKey,
        }),
        {
            tripId: "7",
            tripStopId: null,
            imageObjectKey,
            thumbnailObjectKey: null,
            originalFilename: null,
            description: null,
            capturedAt: null,
            latitude: null,
            longitude: null,
            width: null,
            height: null,
            fileSize: null,
            mimeType: null,
            sortOrder: 0,
            isCover: false,
            isFavorite: false,
            aiTags: null,
        },
    );
});

test("image writes reject avatar and trip-cover object keys", () => {
    const avatarKey =
        "users/42/avatar/2bb95131-6918-4d70-813a-33f916edb781.jpg";

    assert.equal(
        createImageSchema.safeParse({ tripId: "7", imageObjectKey: avatarKey }).success,
        false,
    );
    assert.equal(
        updateImageSchema.safeParse({ imageObjectKey: avatarKey }).success,
        false,
    );
});

test("image list filters parse booleans and validate date ranges", () => {
    assert.deepEqual(
        listImagesQuerySchema.parse({
            tripId: "7",
            favorite: "false",
            cover: "true",
            page: "2",
            pageSize: "10",
        }),
        {
            tripId: "7",
            favorite: false,
            cover: true,
            sort: "createdAtDesc",
            page: 2,
            pageSize: 10,
        },
    );

    assert.equal(
        listImagesQuerySchema.safeParse({
            from: "2026-08-12",
            to: "2026-08-11",
        }).success,
        false,
    );
});
