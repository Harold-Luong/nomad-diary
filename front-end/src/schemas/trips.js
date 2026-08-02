import { z } from 'zod'

import { TRIP_STATUS_VALUES } from '@/constants/domain.js'
import { blankToNull } from '@/utils/string.js'
import { nullableTextSchema, nullableUrlSchema } from './shared.js'

function isCalendarDate(value) {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có định dạng YYYY-MM-DD')
  .refine(isCalendarDate, 'Ngày không hợp lệ')

const nullableDateSchema = z.preprocess(blankToNull, dateSchema.nullable())

const tripFields = {
  title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(255),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug là bắt buộc')
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'),
  description: nullableTextSchema(20_000, 'Mô tả tối đa 20000 ký tự'),
  thumbnailUrl: nullableUrlSchema,
  status: z.number().int().refine((value) => TRIP_STATUS_VALUES.includes(value), 'Trạng thái không hợp lệ'),
  startDate: nullableDateSchema,
  endDate: nullableDateSchema,
  isPublic: z.boolean(),
}

function validateDateRange(value, context) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'Ngày kết thúc không được trước ngày bắt đầu',
    })
  }
}

export const tripSchema = z.object(tripFields).strict().superRefine(validateDateRange)
export const tripUpdateSchema = z
  .object(tripFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Cần ít nhất một trường để cập nhật')
  .superRefine(validateDateRange)
