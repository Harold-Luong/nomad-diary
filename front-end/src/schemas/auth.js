import { z } from 'zod'

import {
  emailSchema,
  nullableTextSchema,
  nullableUrlSchema,
  passwordInputSchema,
  passwordSchema,
} from './shared.js'

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email hoặc username là bắt buộc').max(255),
  password: passwordInputSchema,
})

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(100, 'Username tối đa 100 ký tự')
    .regex(
      /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u,
      'Username chỉ gồm chữ, số, dấu chấm, gạch dưới và gạch ngang',
    ),
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(255).optional(),
})

export const profileSchema = z.object({
  displayName: nullableTextSchema(255, 'Tên hiển thị tối đa 255 ký tự'),
  avatarUrl: nullableUrlSchema,
  bio: nullableTextSchema(5000, 'Giới thiệu tối đa 5000 ký tự'),
}).strict()

export const changePasswordSchema = z
  .object({
    currentPassword: passwordInputSchema,
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  })
