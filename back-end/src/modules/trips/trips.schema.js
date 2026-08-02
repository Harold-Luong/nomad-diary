import { z } from "zod";

import {
    TRIP_SORT_VALUES,
    TRIP_STATUS,
    TRIP_STATUS_VALUES,
} from "../../shared/constants/domain.js";
import { PAGINATION } from "../../shared/pagination/pagination.js";
import { positiveIntegerIdSchema } from "../../shared/validation/schemas.js";

function isCalendarDate(value) {
    const parsed = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    );
}

const date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must use YYYY-MM-DD format")
    .refine(isCalendarDate, "Must be a valid calendar date");

const nullableDate = date.nullable().optional();

const tripFields = {
    title: z.string().trim().min(1).max(255),
    slug: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a URL-safe slug"),
    description: z.string().max(20_000).nullable().optional(),
    thumbnailUrl: z.string().url().max(2_000).nullable().optional(),
    status: z.number().int().refine((value) => TRIP_STATUS_VALUES.includes(value), {
        message: "Must be one of 0, 1, 2, 3, or 4",
    }),
    startDate: nullableDate,
    endDate: nullableDate,
    isPublic: z.boolean(),
};

function validateDateRange(value, context) {
    if (
        value.startDate &&
        value.endDate &&
        value.endDate < value.startDate
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["endDate"],
            message: "endDate cannot be before startDate",
        });
    }
}

export const tripIdParamsSchema = z.object({ id: positiveIntegerIdSchema });

export const createTripSchema = z
    .object({
        ...tripFields,
        description: tripFields.description.default(null),
        thumbnailUrl: tripFields.thumbnailUrl.default(null),
        status: tripFields.status.default(TRIP_STATUS.DRAFT),
        startDate: nullableDate.default(null),
        endDate: nullableDate.default(null),
        isPublic: tripFields.isPublic.default(false),
    })
    .strict()
    .superRefine(validateDateRange);

export const updateTripSchema = z
    .object({
        title: tripFields.title.optional(),
        slug: tripFields.slug.optional(),
        description: tripFields.description,
        thumbnailUrl: tripFields.thumbnailUrl,
        status: tripFields.status.optional(),
        startDate: nullableDate,
        endDate: nullableDate,
        isPublic: tripFields.isPublic.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field is required",
    })
    .superRefine(validateDateRange);

export const listTripsQuerySchema = z.object({
    status: z.coerce
        .number()
        .int()
        .refine((value) => TRIP_STATUS_VALUES.includes(value), {
            message: "Must be one of 0, 1, 2, 3, or 4",
        })
        .optional(),
    year: z.coerce.number().int().min(1).max(9999).optional(),
    search: z.string().trim().min(1).max(255).optional(),
    sort: z.enum(TRIP_SORT_VALUES).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce
        .number()
        .int()
        .min(1)
        .max(PAGINATION.MAX_PAGE_SIZE)
        .optional(),
});
