import { z } from "zod";

import { env } from "../../config/env.js";
import { IMAGE_FILE_EXTENSIONS, UPLOAD_PURPOSES } from "../../shared/constants/image.js";

export const uploadedImageObjectKeySchema = z
    .string()
    .trim()
    .min(1)
    .max(1_024)
    .regex(
        /^users\/[^/]+\/(?:avatar|trip-cover|images)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/i,
        "objectKey must be a key returned by the upload API",
    );

export const avatarObjectKeySchema = uploadedImageObjectKeySchema.refine(
    (value) => value.split("/")[2] === "avatar",
    "objectKey must be an avatar upload",
);

export const tripCoverObjectKeySchema = uploadedImageObjectKeySchema.refine(
    (value) => value.split("/")[2] === "trip-cover",
    "objectKey must be a trip-cover upload",
);

export const imageObjectKeySchema = uploadedImageObjectKeySchema.refine(
    (value) => value.split("/")[2] === "images",
    "objectKey must use the images upload purpose",
);

export const createPresignedUploadSchema = z
    .object({
        fileName: z.string().trim().min(1).max(255),
        contentType: z.enum(Object.keys(IMAGE_FILE_EXTENSIONS)),
        fileSize: z
            .number()
            .int()
            .positive()
            .max(env.s3.uploadMaxSizeMb * 1024 * 1024),
        purpose: z.enum(UPLOAD_PURPOSES).default("images"),
    })
    .strict();
