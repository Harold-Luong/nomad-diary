import { z } from "zod";

import { PAGINATION } from "../../shared/pagination/pagination.js";
import { positiveIntegerIdSchema } from "../../shared/validation/schemas.js";

const paginationFields = {
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce
        .number()
        .int()
        .min(1)
        .max(PAGINATION.MAX_PAGE_SIZE)
        .optional(),
};

const visitedQuerySchema = z
    .enum(["true", "false"])
    .transform((value) => value === "true");

export const provinceIdParamsSchema = z.object({
    id: positiveIntegerIdSchema,
});

export const listProvincesQuerySchema = z.object({
    countryCode: z.string().trim().length(2).toUpperCase().optional(),
    search: z.string().trim().min(1).max(255).optional(),
    visited: visitedQuerySchema.optional(),
    ...paginationFields,
});

export const listVisitedProvincesQuerySchema = z.object({
    countryCode: z.string().trim().length(2).toUpperCase().optional(),
});

export const listProvincePlacesQuerySchema = z.object({
    search: z.string().trim().min(1).max(255).optional(),
    visited: visitedQuerySchema.optional(),
    ...paginationFields,
});
