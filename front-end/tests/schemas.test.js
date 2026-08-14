import { describe, expect, test } from 'vitest'

import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  reorderStopsSchema,
  reviewSchema,
  tripSchema,
  tripStopSchema,
} from '@/schemas/index.js'

describe('authentication schemas', () => {
  test('normalizes login and registration values', () => {
    expect(loginSchema.parse({ identifier: ' nomad ', password: 'secret' })).toEqual({
      identifier: 'nomad',
      password: 'secret',
    })

    const registration = registerSchema.parse({
      username: 'nomad_2026',
      email: ' NOMAD@EXAMPLE.COM ',
      password: 'Password123!',
      displayName: 'Nomad',
    })
    expect(registration.email).toBe('nomad@example.com')
  })

  test('rejects short, oversized and reused passwords', () => {
    expect(registerSchema.safeParse({
      username: 'nomad',
      email: 'nomad@example.com',
      password: 'short',
    }).success).toBe(false)
    expect(registerSchema.safeParse({
      username: 'nomad',
      email: 'nomad@example.com',
      password: 'á'.repeat(40),
    }).success).toBe(false)
    expect(changePasswordSchema.safeParse({
      currentPassword: 'Password123!',
      newPassword: 'Password123!',
    }).success).toBe(false)
  })
})

describe('trip schemas', () => {
  const validTrip = {
    title: 'Đà Lạt',
    slug: 'da-lat',
    description: '',
    thumbnailObjectKey: null,
    status: 1,
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    isPublic: false,
  }

  test('turns optional empty form fields into null', () => {
    expect(tripSchema.parse(validTrip)).toMatchObject({
      description: null,
      thumbnailObjectKey: null,
    })
  })

  test('rejects invalid statuses and reversed date ranges', () => {
    expect(tripSchema.safeParse({ ...validTrip, status: 99 }).success).toBe(false)
    const result = tripSchema.safeParse({ ...validTrip, endDate: '2026-08-09' })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].path).toEqual(['endDate'])
  })
})

describe('trip stop and review schemas', () => {
  test('applies backend-compatible defaults for a new stop and review', () => {
    expect(tripStopSchema.parse({ placeId: '42' })).toEqual({
      placeId: '42',
      arrivedAt: null,
      departedAt: null,
      title: null,
      note: null,
    })
    expect(reviewSchema.parse({})).toEqual({
      rating: null,
      revisitStatus: 0,
      isFavorite: false,
      note: null,
      warningNote: null,
    })
  })

  test('rejects invalid times and duplicate reorder values', () => {
    expect(tripStopSchema.safeParse({
      placeId: '42',
      arrivedAt: '2026-08-02T10:00:00+07:00',
      departedAt: '2026-08-02T09:00:00+07:00',
    }).success).toBe(false)

    expect(reorderStopsSchema.safeParse({
      stops: [
        { id: '1', visitOrder: 1 },
        { id: '1', visitOrder: 1 },
      ],
    }).success).toBe(false)
  })

  test('accepts a catalog location without a pre-existing backend province', () => {
    const result = tripStopSchema.parse({
      place: {
        catalogPlaceId: 'catalog-ba-den',
        countryCode: 'VN',
        provinceCode: '70',
        provinceName: 'Tây Ninh',
        wardCode: '25180',
        wardName: 'Phường Bình Minh',
        name: 'Núi Bà Đen',
        address: null,
        latitude: null,
        longitude: null,
      },
    })

    expect(result.place.provinceCode).toBe('70')
    expect(result.place.wardCode).toBe('25180')
    expect(result.arrivedAt).toBe(null)
  })
})
