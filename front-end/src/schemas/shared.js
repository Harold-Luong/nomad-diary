import { z } from 'zod'
import { blankToNull } from '@/utils/string.js'

const encoder = new TextEncoder()

export const idSchema = z
  .string()
  .regex(/^\d+$/, 'ID phải là số nguyên dương')
  .refine((value) => BigInt(value) > 0n, 'ID phải là số nguyên dương')

export const passwordInputSchema = z
  .string()
  .min(1, 'Mật khẩu là bắt buộc')
  .refine((value) => encoder.encode(value).length <= 72, 'Mật khẩu tối đa 72 byte UTF-8')

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .refine((value) => encoder.encode(value).length <= 72, 'Mật khẩu tối đa 72 byte UTF-8')

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email không hợp lệ')
  .max(255, 'Email tối đa 255 ký tự')

export const nullableUrlSchema = z.preprocess(
  blankToNull,
  z.string().trim().url('URL không hợp lệ').max(2048).nullable(),
)

export const nullableTextSchema = (maximumLength, message) =>
  z.preprocess(
    blankToNull,
    z.string().max(maximumLength, message).nullable(),
  )
