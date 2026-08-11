import { randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../../config/env.js";
import { getS3Client } from "../../config/s3.js";
import { ERRORS, errorArgs } from "../../shared/constants/errors.js";
import { ConfigurationError, NotFoundError } from "../../shared/errors/app-error.js";
import { IMAGE_FILE_EXTENSIONS, PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS } from "../../shared/constants/image.js";
import { uploadedImageObjectKeySchema } from "./uploads.schema.js";


export function isOwnedImageObjectKey(userId, objectKey, purpose) {
    const parsed = uploadedImageObjectKeySchema.safeParse(objectKey);

    if (!parsed.success) {
        return false;
    }

    const [, keyUserId, keyPurpose] = parsed.data.split("/");
    return keyUserId === String(userId) && (!purpose || keyPurpose === purpose);
}

function assertS3UploadConfiguration(configuration) {
    if (configuration.region && configuration.bucketName) {
        return;
    }

    throw new ConfigurationError(...errorArgs(ERRORS.S3_UPLOAD_NOT_CONFIGURED));
}

function assertImageCdnConfiguration(configuration) {
    if (configuration.imageBaseUrl) {
        return;
    }

    throw new ConfigurationError(...errorArgs(ERRORS.IMAGE_CDN_NOT_CONFIGURED));
}

function buildCloudFrontImageUrl(baseUrl, objectKey) {
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    const encodedObjectKey = objectKey
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

    return `${normalizedBaseUrl}/${encodedObjectKey}`;
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

export function createImageUrl(
    userId,
    objectKey,
    options = {},
) {
    if (!isOwnedImageObjectKey(userId, objectKey)) {
        throw new NotFoundError(...errorArgs(ERRORS.IMAGE_NOT_FOUND));
    }

    const configuration = options.configuration ?? env.cloudFront;
    assertImageCdnConfiguration(configuration);

    return {
        imageUrl: buildCloudFrontImageUrl(configuration.imageBaseUrl, objectKey),
        objectKey,
    };
}

export function resolveStoredImageReference(userId, reference) {
    if (!reference) {
        return { objectKey: null, imageUrl: null };
    }

    const image = createImageUrl(userId, reference);
    return { objectKey: reference, imageUrl: image.imageUrl };
}
