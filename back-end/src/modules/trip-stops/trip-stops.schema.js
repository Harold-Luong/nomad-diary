import { z } from "zod";

function isPositiveIntegerString(value) {
    try {
        return BigInt(value) > 0n;
    } catch {
        return false;
    }
}

function isTimestampWithOffset(value) {
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
        return false;
    }

    return !Number.isNaN(Date.parse(value));
}

const id = z
    .string()
    .regex(/^\d+$/, "Must be a positive integer")
    .refine(isPositiveIntegerString, "Must be a positive integer");

const visitOrder = z.number().int().min(1).max(2_147_483_647);

const timestamp = z
    .string()
    .trim()
    .min(1)
    .refine(isTimestampWithOffset, "Must be an ISO-8601 timestamp with an offset");

const nullableTimestamp = timestamp.nullable().optional();

const stopFields = {
    placeId: id,
    visitOrder,
    arrivedAt: nullableTimestamp,
    departedAt: nullableTimestamp,
    title: z.string().trim().min(1).max(255).nullable().optional(),
    note: z.string().max(20_000).nullable().optional(),
};

function validateStopTimes(value, context) {
    if (
        value.arrivedAt &&
        value.departedAt &&
        Date.parse(value.departedAt) < Date.parse(value.arrivedAt)
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["departedAt"],
            message: "departedAt cannot be before arrivedAt",
        });
    }
}

export const tripIdParamsSchema = z.object({ tripId: id });

export const tripStopIdParamsSchema = z.object({ id });

export const createTripStopSchema = z
    .object({
        placeId: stopFields.placeId,
        visitOrder: stopFields.visitOrder.optional(),
        arrivedAt: nullableTimestamp.default(null),
        departedAt: nullableTimestamp.default(null),
        title: stopFields.title.default(null),
        note: stopFields.note.default(null),
    })
    .strict()
    .superRefine(validateStopTimes);

export const updateTripStopSchema = z
    .object({
        placeId: stopFields.placeId.optional(),
        visitOrder: stopFields.visitOrder.optional(),
        arrivedAt: nullableTimestamp,
        departedAt: nullableTimestamp,
        title: stopFields.title,
        note: stopFields.note,
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field is required",
    })
    .superRefine(validateStopTimes);

export const reorderTripStopsSchema = z
    .object({
        stops: z
            .array(
                z
                    .object({
                        id,
                        visitOrder,
                    })
                    .strict(),
            )
            .min(1),
    })
    .strict()
    .superRefine((value, context) => {
        const ids = new Set();
        const orders = new Set();

        value.stops.forEach((stop, index) => {
            if (ids.has(stop.id)) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["stops", index, "id"],
                    message: "Each stop may appear only once",
                });
            }

            if (orders.has(stop.visitOrder)) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["stops", index, "visitOrder"],
                    message: "Each visitOrder must be unique",
                });
            }

            ids.add(stop.id);
            orders.add(stop.visitOrder);
        });
    });
