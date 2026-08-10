import assert from "node:assert/strict";
import test from "node:test";

import { S3Client } from "@aws-sdk/client-s3";

import { loadEnvironment } from "../../src/config/load-environment.js";

loadEnvironment("development");

const {
    createPresignedImageUrl,
    createPresignedUpload,
    PRESIGNED_IMAGE_EXPIRES_IN_SECONDS,
    PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
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

test("presigned S3 GET URL reads an image owned by the current user", async () => {
    const objectKey =
        "users/42/image/2bb95131-6918-4d70-813a-33f916edb781.webp";
    const result = await createPresignedImageUrl("42", objectKey, {
        client,
        configuration: {
            region: "ap-southeast-1",
            bucketName: "nomad-diary-test",
        },
    });
    const signedUrl = new URL(result.imageUrl);

    assert.equal(
        signedUrl.searchParams.get("X-Amz-Expires"),
        String(PRESIGNED_IMAGE_EXPIRES_IN_SECONDS),
    );
    assert.equal(decodeURIComponent(signedUrl.pathname), `/${objectKey}`);
    assert.deepEqual(result, {
        imageUrl: result.imageUrl,
        objectKey,
        expiresIn: 300,
        method: "GET",
    });
});

test("presigned S3 GET URL hides images owned by another user", async () => {
    await assert.rejects(
        createPresignedImageUrl(
            "42",
            "users/7/image/2bb95131-6918-4d70-813a-33f916edb781.jpg",
            {
                client,
                configuration: {
                    region: "ap-southeast-1",
                    bucketName: "nomad-diary-test",
                },
            },
        ),
        (error) => error.code === "IMAGE_NOT_FOUND" && error.statusCode === 404,
    );
});
