import { z } from "zod";

function isPositiveIntegerString(value) {
    try {
        return BigInt(value) > 0n;
    } catch {
        return false;
    }
}

export const positiveIntegerIdSchema = z
    .string()
    .regex(/^\d+$/, "Must be a positive integer")
    .refine(isPositiveIntegerString, "Must be a positive integer");
