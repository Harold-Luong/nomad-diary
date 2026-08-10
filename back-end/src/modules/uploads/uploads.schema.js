import { z } from "zod";

import { env } from "../../config/env.js";

export const IMAGE_CONTENT_TYPES = Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export const UPLOAD_PURPOSES = Object.freeze([
    "avatar",
    "trip-cover",
    "image",
]);

export const createPresignedUploadSchema = z
    .object({
        fileName: z.string().trim().min(1).max(255),
        contentType: z.enum(IMAGE_CONTENT_TYPES),
        fileSize: z
            .number()
            .int()
            .positive()
            .max(env.s3.uploadMaxSizeMb * 1024 * 1024),
        purpose: z.enum(UPLOAD_PURPOSES).default("image"),
    })
    .strict();
