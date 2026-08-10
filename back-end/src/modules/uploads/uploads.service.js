import { randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../../config/env.js";
import { getS3Client } from "../../config/s3.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { ConfigurationError } from "../../shared/errors/app-error.js";

export const PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS = 5 * 60;

const FILE_EXTENSIONS = Object.freeze({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
});

function assertS3UploadConfiguration(configuration) {
    if (configuration.region && configuration.bucketName) {
        return;
    }

    throw new ConfigurationError(...errorArgs(ERRORS.S3_UPLOAD_NOT_CONFIGURED));
}

export async function createPresignedUpload(
    userId,
    upload,
    options = {},
) {
    const configuration = options.configuration ?? env.s3;
    assertS3UploadConfiguration(configuration);
    const client = options.client ?? getS3Client();

    const extension = FILE_EXTENSIONS[upload.contentType];
    const objectKey = `users/${userId}/${upload.purpose}/${randomUUID()}.${extension}`;
    const command = new PutObjectCommand({
        Bucket: configuration.bucketName,
        Key: objectKey,
        ContentType: upload.contentType,
        ContentLength: upload.fileSize,
        Metadata: {
            "original-file-name": encodeURIComponent(upload.fileName),
        },
    });
    const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
        signableHeaders: new Set(["content-type"]),
    });

    return {
        uploadUrl,
        objectKey,
        expiresIn: PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
        method: "PUT",
        headers: {
            "Content-Type": upload.contentType,
        },
    };
}
