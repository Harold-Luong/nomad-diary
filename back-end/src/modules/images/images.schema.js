import { z } from "zod";

import { IMAGE_FILE_EXTENSIONS } from "../../shared/constants/image.js";
import { PAGINATION } from "../../shared/pagination/pagination.js";
import { positiveIntegerIdSchema } from "../../shared/validation/schemas.js";
import { imageObjectKeySchema } from "../uploads/uploads.schema.js";

export const IMAGE_SORT = Object.freeze({
    CREATED_AT_DESC: "createdAtDesc",
    CREATED_AT_ASC: "createdAtAsc",
    CAPTURED_AT_DESC: "capturedAtDesc",
    CAPTURED_AT_ASC: "capturedAtAsc",
    SORT_ORDER_ASC: "sortOrderAsc",
    SORT_ORDER_DESC: "sortOrderDesc",
});

export const IMAGE_SORT_VALUES = Object.freeze(Object.values(IMAGE_SORT));

const timestampWithOffset = z
    .string()
    .trim()
    .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/i,
        "Must be an ISO-8601 timestamp with an offset",
    )
    .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid timestamp");

const calendarDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must use YYYY-MM-DD format")
    .refine((value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "Must be a valid calendar date");

const booleanQuery = z
    .enum(["true", "false"])
    .transform((value) => value === "true");

const aiTagSchema = z
    .object({
        name: z.string().trim().min(1).max(100),
        confidence: z.number().min(0).max(1),
    })
    .strict();

const imageFields = {
    tripStopId: positiveIntegerIdSchema.nullable().optional(),
    imageObjectKey: imageObjectKeySchema,
    thumbnailObjectKey: imageObjectKeySchema.nullable().optional(),
    originalFilename: z.string().trim().min(1).max(500).nullable().optional(),
    description: z.string().max(20_000).nullable().optional(),
    capturedAt: timestampWithOffset.nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    fileSize: z.number().int().nonnegative().nullable().optional(),
    mimeType: z.enum(Object.keys(IMAGE_FILE_EXTENSIONS)).nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    isCover: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
    aiTags: z.array(aiTagSchema).nullable().optional(),
};

export const imageIdParamsSchema = z.object({ id: positiveIntegerIdSchema });

export const createImageSchema = z
    .object({
        tripId: positiveIntegerIdSchema,
        tripStopId: imageFields.tripStopId.default(null),
        imageObjectKey: imageFields.imageObjectKey,
        thumbnailObjectKey: imageFields.thumbnailObjectKey.default(null),
        originalFilename: imageFields.originalFilename.default(null),
        description: imageFields.description.default(null),
        capturedAt: imageFields.capturedAt.default(null),
        latitude: imageFields.latitude.default(null),
        longitude: imageFields.longitude.default(null),
        width: imageFields.width.default(null),
        height: imageFields.height.default(null),
        fileSize: imageFields.fileSize.default(null),
        mimeType: imageFields.mimeType.default(null),
        sortOrder: imageFields.sortOrder.default(0),
        isCover: imageFields.isCover.default(false),
        isFavorite: imageFields.isFavorite.default(false),
        aiTags: imageFields.aiTags.default(null),
    })
    .strict();

export const updateImageSchema = z
    .object(imageFields)
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one image field is required",
    });

export const listImagesQuerySchema = z
    .object({
        tripId: positiveIntegerIdSchema.optional(),
        tripStopId: positiveIntegerIdSchema.optional(),
        placeId: positiveIntegerIdSchema.optional(),
        provinceId: positiveIntegerIdSchema.optional(),
        favorite: booleanQuery.optional(),
        cover: booleanQuery.optional(),
        from: calendarDate.optional(),
        to: calendarDate.optional(),
        sort: z.enum(IMAGE_SORT_VALUES).default(IMAGE_SORT.CREATED_AT_DESC),
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce
            .number()
            .int()
            .min(1)
            .max(PAGINATION.MAX_PAGE_SIZE)
            .optional(),
    })
    .strict()
    .refine((value) => !value.from || !value.to || value.to >= value.from, {
        path: ["to"],
        message: "to cannot be before from",
    });
