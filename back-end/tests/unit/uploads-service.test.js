import assert from "node:assert/strict";
import test from "node:test";

import { S3Client } from "@aws-sdk/client-s3";

import { loadEnvironment } from "../../src/config/load-environment.js";
import { PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS } from "../../src/shared/constants/image.js";

loadEnvironment("development");

const {
    createImageUrl,
    createPresignedUpload,
    isOwnedImageObjectKey,
} = await import("../../src/modules/uploads/uploads.service.js");

const client = new S3Client({
    region: "ap-southeast-1",
    credentials: {
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
    },
});

test("presigned S3 PUT URL expires after exactly five minutes", async () => {
    const result = await createPresignedUpload(
        "42",
        {
            fileName: "ảnh Đà Lạt.jpg",
            contentType: "image/jpeg",
            fileSize: 2048,
            purpose: "trip-cover",
        },
        {
            client,
            configuration: {
                region: "ap-southeast-1",
                bucketName: "nomad-diary-test",
            },
        },
    );

    const signedUrl = new URL(result.uploadUrl);

    assert.equal(
        signedUrl.searchParams.get("X-Amz-Expires"),
        String(PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS),
    );
    assert.match(
        signedUrl.searchParams.get("X-Amz-SignedHeaders"),
        /content-length/,
    );
    assert.equal(result.expiresIn, 300);
    assert.equal(result.method, "PUT");
    assert.deepEqual(result.headers, { "Content-Type": "image/jpeg" });
    assert.match(result.objectKey, /^users\/42\/trip-cover\/[0-9a-f-]+\.jpg$/);
    assert.deepEqual(
        Object.keys(result).sort(),
        ["expiresIn", "headers", "method", "objectKey", "uploadUrl"].sort(),
    );
});

test("CloudFront image URL is built from an image owned by the current user", () => {
    const objectKey =
        "users/42/images/2bb95131-6918-4d70-813a-33f916edb781.webp";
    const result = createImageUrl("42", objectKey, {
        configuration: {
            imageBaseUrl: "https://images.example.cloudfront.net/",
        },
    });

    assert.deepEqual(result, {
        imageUrl: `https://images.example.cloudfront.net/${objectKey}`,
        objectKey,
    });
});

test("CloudFront image URL hides images owned by another user", () => {
    assert.throws(
        () => createImageUrl(
            "42",
            "users/7/images/2bb95131-6918-4d70-813a-33f916edb781.jpg",
            {
                configuration: {
                    imageBaseUrl: "https://images.example.cloudfront.net",
                },
            },
        ),
        (error) => error.code === "IMAGE_NOT_FOUND" && error.statusCode === 404,
    );
});

test("CloudFront image URL requires CDN configuration", () => {
    assert.throws(
        () => createImageUrl(
            "42",
            "users/42/images/2bb95131-6918-4d70-813a-33f916edb781.jpg",
            { configuration: {} },
        ),
        (error) =>
            error.code === "IMAGE_CDN_NOT_CONFIGURED" &&
            error.statusCode === 500,
    );
});

test("stored image keys are scoped by user and upload purpose", () => {
    const avatarKey =
        "users/42/avatar/2bb95131-6918-4d70-813a-33f916edb781.jpg";

    assert.equal(isOwnedImageObjectKey("42", avatarKey), true);
    assert.equal(isOwnedImageObjectKey("42", avatarKey, "avatar"), true);
    assert.equal(isOwnedImageObjectKey("42", avatarKey, "trip-cover"), false);
    assert.equal(isOwnedImageObjectKey("7", avatarKey), false);
    assert.equal(isOwnedImageObjectKey("42", "users/42/images/not-a-uuid.jpg"), false);
});
