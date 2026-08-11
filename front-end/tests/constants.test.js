import { describe, expect, test } from 'vitest'

import {
  AUTH_SCHEME,
  CLIENT_ERROR_CODE,
  PAGINATION,
  REVISIT_STATUS,
  REVISIT_STATUS_OPTIONS,
  REVISIT_STATUS_VALUES,
  ROUTE_NAME,
  ROUTE_PATH,
  STORAGE_KEY,
  TRIP_STATUS,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_OPTIONS,
  TRIP_STATUS_VALUES,
  VISIT_ORDER,
} from '@/constants/index.js'

describe('shared constants', () => {
  test('domain values match backend enums', () => {
    expect(TRIP_STATUS).toEqual({
      DRAFT: 0,
      PLANNED: 1,
      ONGOING: 2,
      COMPLETED: 3,
      CANCELLED: 4,
    })
    expect(REVISIT_STATUS).toEqual({
      NOT_REVIEWED: 0,
      RECOMMENDED: 1,
      CONSIDER: 2,
      NOT_RECOMMENDED: 3,
    })
    expect(TRIP_STATUS_LABEL[TRIP_STATUS.COMPLETED]).toBe('Hoàn thành')
    expect(TRIP_STATUS_VALUES).toEqual([0, 1, 2, 3, 4])
    expect(REVISIT_STATUS_VALUES).toEqual([0, 1, 2, 3])
    expect(VISIT_ORDER).toEqual({ MIN: 1, MAX: 2_147_483_647 })
  })

  test('route, storage, auth and pagination values remain stable', () => {
    expect(ROUTE_NAME.TRIP_DETAIL).toBe('trip-detail')
    expect(ROUTE_PATH.TRIP_DETAIL).toBe('/trips/:id')
    expect(ROUTE_PATH.TRIP_IMAGES).toBe('/trips/:id/images')
    expect(STORAGE_KEY.AUTH_SESSION).toBe('nomad-diary.auth-session')
    expect(AUTH_SCHEME.BEARER).toBe('Bearer')
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20)
    expect(PAGINATION.MAX_PAGE_SIZE).toBe(100)
    expect(CLIENT_ERROR_CODE.NETWORK).toBe('NETWORK_ERROR')
  })

  test('constant objects and option lists are immutable', () => {
    expect(Object.isFrozen(TRIP_STATUS)).toBe(true)
    expect(Object.isFrozen(TRIP_STATUS_OPTIONS)).toBe(true)
    expect(Object.isFrozen(TRIP_STATUS_VALUES)).toBe(true)
    expect(TRIP_STATUS_OPTIONS.every(Object.isFrozen)).toBe(true)
    expect(Object.isFrozen(REVISIT_STATUS_OPTIONS)).toBe(true)
    expect(Object.isFrozen(ROUTE_NAME)).toBe(true)
    expect(Object.isFrozen(ROUTE_PATH)).toBe(true)
  })
})
