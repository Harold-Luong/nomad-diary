import { z } from 'zod'

import { REVISIT_STATUS, REVISIT_STATUS_VALUES } from '@/constants/domain.js'
import { nullableTextSchema } from './shared.js'

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable().default(null),
  revisitStatus: z
    .number()
    .int()
    .refine((value) => REVISIT_STATUS_VALUES.includes(value), 'Trạng thái quay lại không hợp lệ')
    .default(REVISIT_STATUS.NOT_REVIEWED),
  isFavorite: z.boolean().default(false),
  note: nullableTextSchema(20_000, 'Ghi chú tối đa 20000 ký tự').default(null),
  warningNote: nullableTextSchema(20_000, 'Cảnh báo tối đa 20000 ký tự').default(null),
}).strict()
