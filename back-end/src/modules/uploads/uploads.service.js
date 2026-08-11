import { randomUUID } from "node:crypto";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../../config/env.js";
import { getS3Client } from "../../config/s3.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { ConfigurationError, NotFoundError } from "../../shared/errors/app-error.js";
import { IMAGE_FILE_EXTENSIONS, PRESIGNED_IMAGE_EXPIRES_IN_SECONDS, PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS } from "../../shared/constants/image.js";


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

    const extension = IMAGE_FILE_EXTENSIONS[upload.contentType];
    const objectKey = `users/${userId}/${upload.purpose}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
        Bucket: configuration.bucketName,
        Key: objectKey,
        ContentType: upload.contentType,
        ContentLength: upload.fileSize,
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

export async function createPresignedImageUrl(
    userId,
    objectKey,
    options = {},
) {
    const userPrefix = `users/${userId}/`;
    if (!objectKey.startsWith(userPrefix)) {
        throw new NotFoundError(...errorArgs(ERRORS.IMAGE_NOT_FOUND));
    }

    const configuration = options.configuration ?? env.s3;
    assertS3UploadConfiguration(configuration);
    const client = options.client ?? getS3Client();

    const command = new GetObjectCommand({
        Bucket: configuration.bucketName,
        Key: objectKey,
    });
    const imageUrl = await getSignedUrl(client, command, {
        expiresIn: PRESIGNED_IMAGE_EXPIRES_IN_SECONDS,
    });

    return {
        imageUrl,
        objectKey,
        expiresIn: PRESIGNED_IMAGE_EXPIRES_IN_SECONDS,
        method: "GET",
    };
}
