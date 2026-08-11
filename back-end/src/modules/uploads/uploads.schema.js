import { z } from "zod";

import { env } from "../../config/env.js";
import { UPLOAD_PURPOSES } from "../../shared/constants/image.js";

export const createPresignedUploadSchema = z
    .object({
        fileName: z.string().trim().min(1).max(255),
        contentType: z.enum(Object.keys(IMAGE_FILE_EXTENSIONS)),
        fileSize: z
            .number()
            .int()
            .positive()
            .max(env.s3.uploadMaxSizeMb * 1024 * 1024),
        purpose: z.enum(UPLOAD_PURPOSES).default("image"),
    })
    .strict();

export const getPresignedImageQuerySchema = z
    .object({
        objectKey: z
            .string()
            .trim()
            .min(1)
            .max(1_024)
            .regex(
                /^users\/[^/]+\/(?:avatar|trip-cover|image)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i,
                "objectKey must be a key returned by the upload API",
            ),
    })
    .strict();
