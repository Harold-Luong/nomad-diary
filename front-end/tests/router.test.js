import { expect, test } from 'vitest'

import { routes } from '@/router/routes.js'

test('router exposes public, guest-only and authenticated application pages', () => {
  const byName = Object.fromEntries(routes.map((route) => [route.name, route]))

  expect(byName.home.path).toBe('/')
  expect(byName.login.meta.guestOnly).toBe(true)
  expect(byName.register.meta.guestOnly).toBe(true)
  expect(byName.trips.meta.requiresAuth).toBe(true)
  expect(byName['trip-create'].path).toBe('/trips/new')
  expect(byName['trip-detail'].props).toBe(true)
  expect(byName['trip-stop-review'].meta.requiresAuth).toBe(true)
  expect(byName.provinces.path).toBe('/provinces')
  expect(byName['province-detail'].props).toBe(true)
  expect(byName.profile.meta.requiresAuth).toBe(true)
  expect(byName['not-found'].path).toBe('/:pathMatch(.*)*')
})

test('route names and paths are unique', () => {
  const names = routes.map((route) => route.name)
  const paths = routes.map((route) => route.path)

  expect(new Set(names).size).toBe(names.length)
  expect(new Set(paths).size).toBe(paths.length)
})
