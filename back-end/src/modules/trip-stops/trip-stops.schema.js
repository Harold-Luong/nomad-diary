import { z } from "zod";
import { VISIT_ORDER } from "../../shared/constants/domain.js";
import { positiveIntegerIdSchema } from "../../shared/validation/schemas.js";

const ISO_TIMESTAMP_WITH_OFFSET_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-](\d{2}):(\d{2}))$/i;

function isTimestampWithOffset(value) {
    const match = ISO_TIMESTAMP_WITH_OFFSET_PATTERN.exec(value);

    if (!match) {
        return false;
    }

    const [
        ,
        yearText,
        monthText,
        dayText,
        hourText,
        minuteText,
        secondText,
        offsetHourText,
        offsetMinuteText,
    ] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const offsetHour = Number(offsetHourText ?? 0);
    const offsetMinute = Number(offsetMinuteText ?? 0);
    const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (
        year < 1 ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > daysInMonth[month - 1] ||
        hour > 23 ||
        minute > 59 ||
        second > 59 ||
        offsetHour > 14 ||
        offsetMinute > 59 ||
        (offsetHour === 14 && offsetMinute !== 0)
    ) {
        return false;
    }

    return !Number.isNaN(Date.parse(value));
}

const visitOrder = z.number().int().min(VISIT_ORDER.MIN).max(VISIT_ORDER.MAX);

const timestamp = z
    .string()
    .trim()
    .min(1)
    .refine(isTimestampWithOffset, "Must be an ISO-8601 timestamp with an offset");

const nullableTimestamp = timestamp.nullable().optional();

const placeInput = z
    .object({
        catalogPlaceId: z.string().trim().min(1).max(64).nullable().optional(),
        countryCode: z.string().trim().length(2).toUpperCase().default("VN"),
        provinceCode: z.string().trim().min(1).max(50),
        provinceName: z.string().trim().min(1).max(255),
        wardCode: z.string().trim().min(1).max(50),
        wardName: z.string().trim().min(1).max(255),
        name: z.string().trim().min(1).max(255),
        address: z.string().trim().min(1).max(2_000).nullable().optional(),
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
    })
    .strict();

const stopFields = {
    placeId: positiveIntegerIdSchema,
    place: placeInput,
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

function validatePlaceSelection(value, context, required) {
    const hasPlaceId = value.placeId !== undefined;
    const hasPlace = value.place !== undefined;

    if ((required && !hasPlaceId && !hasPlace) || (hasPlaceId && hasPlace)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["place"],
            message: "Provide exactly one of placeId or place",
        });
    }
}

export const tripIdParamsSchema = z.object({ tripId: positiveIntegerIdSchema });

export const tripStopIdParamsSchema = z.object({ id: positiveIntegerIdSchema });

export const createTripStopSchema = z
    .object({
        placeId: stopFields.placeId.optional(),
        place: stopFields.place.optional(),
        visitOrder: stopFields.visitOrder.optional(),
        arrivedAt: nullableTimestamp.default(null),
        departedAt: nullableTimestamp.default(null),
        title: stopFields.title.default(null),
        note: stopFields.note.default(null),
    })
    .strict()
    .superRefine((value, context) => {
        validatePlaceSelection(value, context, true);
        validateStopTimes(value, context);
    });

export const updateTripStopSchema = z
    .object({
        placeId: stopFields.placeId.optional(),
        place: stopFields.place.optional(),
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
    .superRefine((value, context) => {
        validatePlaceSelection(value, context, false);
        validateStopTimes(value, context);
    });

export const reorderTripStopsSchema = z
    .object({
        stops: z
            .array(
                z
                    .object({
                        id: positiveIntegerIdSchema,
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
