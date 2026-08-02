import { z } from "zod";

import {
    REVISIT_STATUS,
    REVISIT_STATUS_VALUES,
} from "../../shared/constants/domain.js";
import { positiveIntegerIdSchema } from "../../shared/validation/schemas.js";

export const tripStopReviewParamsSchema = z.object({
    tripStopId: positiveIntegerIdSchema,
});

export const putReviewSchema = z
    .object({
        rating: z.number().int().min(1).max(5).nullable().default(null),
        revisitStatus: z
            .number()
            .int()
            .refine((value) => REVISIT_STATUS_VALUES.includes(value), {
                message: "Must be one of 0, 1, 2, or 3",
            })
            .default(REVISIT_STATUS.NOT_REVIEWED),
        isFavorite: z.boolean().default(false),
        note: z.string().max(20_000).nullable().default(null),
        warningNote: z.string().max(20_000).nullable().default(null),
    })
    .strict();
