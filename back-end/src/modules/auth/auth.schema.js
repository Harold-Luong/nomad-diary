import { z } from "zod";

import { avatarObjectKeySchema } from "../uploads/uploads.schema.js";

const passwordSchema = z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(72, "Password must contain at most 72 characters")
    .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Password must contain at most 72 UTF-8 bytes",
    );

const passwordInputSchema = z
    .string()
    .min(1, "Password is required")
    .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Password must contain at most 72 UTF-8 bytes",
    );

const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Email must be valid")
    .max(255, "Email must contain at most 255 characters");

const optionalDisplayNameSchema = z.string().trim().min(1).max(255).nullable();
const optionalBioSchema = z.string().trim().max(5000).nullable();

export const registerSchema = z
    .object({
        username: z
            .string()
            .trim()
            .min(3, "Username must contain at least 3 characters")
            .max(100, "Username must contain at most 100 characters")
            .regex(
                /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u,
                "Username may contain letters, numbers, dots, underscores, and hyphens",
            ),
        email: emailSchema,
        password: passwordSchema,
        displayName: optionalDisplayNameSchema.optional(),
    })
    .strict();

export const loginSchema = z
    .object({
        identifier: z.string().trim().min(1).max(255).optional(),
        email: emailSchema.optional(),
        password: passwordInputSchema,
    })
    .strict()
    .superRefine((value, context) => {
        if (!value.identifier && !value.email) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Email or identifier is required",
                path: ["identifier"],
            });
        }
    })
    .transform(({ identifier, email, password }) => ({
        // Keep the legacy `email` field compatible, but prefer it if Swagger or
        // another client accidentally sends both fields.
        identifier: email ?? identifier,
        password,
    }));

export const refreshTokenSchema = z
    .object({
        refreshToken: z.string().trim().min(1, "Refresh token is required").max(4096),
    })
    .strict();

export const updateProfileSchema = z
    .object({
        displayName: optionalDisplayNameSchema.optional(),
        avatarObjectKey: avatarObjectKeySchema.nullable().optional(),
        bio: optionalBioSchema.optional(),
    })
    .strict()
    .refine(
        (value) => Object.values(value).some((field) => field !== undefined),
        "At least one profile field is required",
    );

export const changePasswordSchema = z
    .object({
        currentPassword: passwordInputSchema,
        newPassword: passwordSchema,
    })
    .strict()
    .refine((value) => value.currentPassword !== value.newPassword, {
        message: "New password must be different from current password",
        path: ["newPassword"],
    });

export const deleteAccountSchema = z
    .object({
        password: passwordInputSchema,
    })
    .strict();
