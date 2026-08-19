import { z } from 'zod'

import { VISIT_ORDER } from '@/constants/domain.js'
import { blankToNull } from '@/utils/string.js'
import { idSchema, nullableTextSchema } from './shared.js'

const timestampSchema = z
  .string()
  .trim()
  .refine(
    (value) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && !Number.isNaN(Date.parse(value)),
    'Thời gian phải là ISO-8601 và có timezone',
  )

const nullableTimestampSchema = z.preprocess(blankToNull, timestampSchema.nullable())

const placeInputSchema = z.object({
  catalogPlaceId: z.string().trim().min(1).max(64).nullable().optional(),
  countryCode: z.string().trim().length(2).toUpperCase().default('VN'),
  provinceCode: z.string().trim().min(1).max(50),
  provinceName: z.string().trim().min(1).max(255),
  wardCode: z.string().trim().min(1).max(50),
  wardName: z.string().trim().min(1).max(255),
  name: z.string().trim().min(1).max(255),
  address: z.string().trim().min(1).max(2_000).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
}).strict()

const stopFields = {
  placeId: idSchema,
  place: placeInputSchema,
  visitOrder: z.number().int().min(VISIT_ORDER.MIN).max(VISIT_ORDER.MAX).optional(),
  arrivedAt: nullableTimestampSchema,
  departedAt: nullableTimestampSchema,
  title: nullableTextSchema(255, 'Tiêu đề tối đa 255 ký tự'),
  note: nullableTextSchema(20_000, 'Ghi chú tối đa 20000 ký tự'),
}

function validatePlaceSelection(value, context, required) {
  const hasPlaceId = value.placeId !== undefined
  const hasPlace = value.place !== undefined

  if ((required && !hasPlaceId && !hasPlace) || (hasPlaceId && hasPlace)) {
    context.addIssue({
      code: 'custom',
      path: ['place'],
      message: 'Cần chọn một địa điểm đã lưu hoặc cung cấp địa điểm mới',
    })
  }
}

function validateTimeRange(value, context) {
  if (
    value.arrivedAt &&
    value.departedAt &&
    Date.parse(value.departedAt) < Date.parse(value.arrivedAt)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['departedAt'],
      message: 'Thời gian rời đi không được trước thời gian đến',
    })
  }
}

export const tripStopSchema = z
  .object({
    placeId: stopFields.placeId.optional(),
    place: stopFields.place.optional(),
    visitOrder: stopFields.visitOrder,
    arrivedAt: stopFields.arrivedAt.optional().default(null),
    departedAt: stopFields.departedAt.optional().default(null),
    title: stopFields.title.optional().default(null),
    note: stopFields.note.optional().default(null),
  })
  .strict()
  .superRefine((value, context) => {
    validatePlaceSelection(value, context, true)
    validateTimeRange(value, context)
  })

export const tripStopUpdateSchema = z
  .object(stopFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Cần ít nhất một trường để cập nhật')
  .superRefine((value, context) => {
    validatePlaceSelection(value, context, false)
    validateTimeRange(value, context)
  })

export const reorderStopsSchema = z.object({
  stops: z
    .array(
      z.object({
        id: idSchema,
        visitOrder: z.number().int().min(VISIT_ORDER.MIN).max(VISIT_ORDER.MAX),
      }).strict(),
    )
    .min(1, 'Danh sách điểm dừng không được trống'),
}).strict().superRefine((value, context) => {
  const ids = new Set()
  const orders = new Set()

  value.stops.forEach((stop, index) => {
    if (ids.has(stop.id)) {
      context.addIssue({
        code: 'custom',
        path: ['stops', index, 'id'],
        message: 'Mỗi điểm dừng chỉ được xuất hiện một lần',
      })
    }

    if (orders.has(stop.visitOrder)) {
      context.addIssue({
        code: 'custom',
        path: ['stops', index, 'visitOrder'],
        message: 'Thứ tự ghé thăm không được trùng nhau',
      })
    }

    ids.add(stop.id)
    orders.add(stop.visitOrder)
  })
})
