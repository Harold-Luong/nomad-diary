import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { useFormValidation } from '@/composables/index.js'
import {
  clamp,
  blankToNull,
  emptyToNull,
  formatDate,
  formatNumber,
  isValidDate,
  mergePlaceOptions,
  normalizePlaceName,
  slugify,
  toDateInputValue,
  toInteger,
  truncate,
  validateSchema,
} from '@/utils/index.js'

describe('date utilities', () => {
  test('formats date-only values without timezone drift', () => {
    expect(formatDate('2026-08-02')).toBe('02/08/2026')
    expect(toDateInputValue('2026-08-02T16:00:00.000Z')).toBe('2026-08-02')
  })

  test('rejects invalid calendar dates and uses a fallback', () => {
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(formatDate('invalid', { fallback: 'N/A' })).toBe('N/A')
  })
})

describe('number and string utilities', () => {
  test('normalizes common input values', () => {
    expect(toInteger('3')).toBe(3)
    expect(toInteger('3.5')).toBe(null)
    expect(clamp(12, 1, 10)).toBe(10)
    expect(formatNumber(1200, { locale: 'en-US' })).toBe('1,200')
  })

  test('supports Vietnamese slugs and safe truncation', () => {
    expect(blankToNull('   ')).toBe(null)
    expect(blankToNull('  giữ khoảng trắng  ')).toBe('  giữ khoảng trắng  ')
    expect(emptyToNull('   ')).toBe(null)
    expect(slugify('Đà Lạt mùa Hè 2026')).toBe('da-lat-mua-he-2026')
    expect(truncate('Nomad Diary', 8)).toBe('Nomad D…')
    expect(truncate('Nomad', 0)).toBe('')
  })
})

describe('place utilities', () => {
  test('merges places only by catalog identity and keeps same-name locations distinct', () => {
    expect(mergePlaceOptions(
      [
        { placeId: 'catalog-1', name: 'Cầu Rồng', address: 'Đầu cầu phía Tây' },
        { placeId: 'catalog-2', name: 'Cầu Rồng', address: 'Đầu cầu phía Đông' },
      ],
      [
        { id: '10', name: 'Cầu Rồng', catalogPlaceId: 'catalog-1' },
        { id: '11', name: 'Cầu Rồng', address: 'Địa điểm tự nhập' },
      ],
    )).toEqual([
      {
        key: 'backend:10',
        name: 'Cầu Rồng',
        backendPlaceId: '10',
        catalogPlaceId: 'catalog-1',
        address: 'Đầu cầu phía Tây',
        latitude: null,
        longitude: null,
        selectionValue: 'Cầu Rồng — Đầu cầu phía Tây',
      },
      {
        key: 'backend:11',
        name: 'Cầu Rồng',
        backendPlaceId: '11',
        catalogPlaceId: null,
        address: 'Địa điểm tự nhập',
        latitude: null,
        longitude: null,
        selectionValue: 'Cầu Rồng — Địa điểm tự nhập',
      },
      {
        key: 'catalog:catalog-2',
        name: 'Cầu Rồng',
        backendPlaceId: null,
        catalogPlaceId: 'catalog-2',
        address: 'Đầu cầu phía Đông',
        latitude: null,
        longitude: null,
        selectionValue: 'Cầu Rồng — Đầu cầu phía Đông',
      },
    ])
    expect(normalizePlaceName('  Đồi   chè Cầu Đất ')).toBe('doi che cau dat')
  })
})

describe('validation utilities', () => {
  const schema = z.object({ name: z.string().min(3, 'Tên quá ngắn') })

  test('maps Zod issues by field name', () => {
    expect(validateSchema(schema, { name: 'a' })).toEqual({
      success: false,
      data: null,
      errors: { name: ['Tên quá ngắn'] },
    })
  })

  test('composable returns parsed data and exposes the first field error', () => {
    const { validate, errorFor, resetValidation } = useFormValidation(schema)

    expect(validate({ name: '' })).toBe(null)
    expect(errorFor('name')).toBe('Tên quá ngắn')
    resetValidation()
    expect(errorFor('name')).toBe(null)
    expect(validate({ name: 'Nomad' })).toEqual({ name: 'Nomad' })
  })
})
