import { reactive } from 'vue'
import { beforeEach, expect, test, vi } from 'vitest'

import { configureAuthTabSync } from '@/services/auth-tab-sync.js'

class FakeBroadcastChannel {
  static channels = []

  constructor(name) {
    this.name = name
    this.listeners = []
    FakeBroadcastChannel.channels.push(this)
  }

  addEventListener(type, listener) {
    if (type === 'message') this.listeners.push(listener)
  }

  postMessage(data) {
    const clonedData = structuredClone(data)
    FakeBroadcastChannel.channels
      .filter((channel) => channel !== this && channel.name === this.name)
      .forEach((channel) => {
        channel.listeners.forEach((listener) => listener({ data: clonedData }))
      })
  }

  close() {
    FakeBroadcastChannel.channels = FakeBroadcastChannel.channels.filter(
      (channel) => channel !== this,
    )
  }
}

function createAuthStore(session = null) {
  return {
    session,
    publisher: null,
    configureSessionPublisher(publisher) {
      this.publisher = publisher
    },
    getSessionSnapshot() {
      return this.session
    },
    applySession(nextSession) {
      this.session = nextSession
    },
    clearSession() {
      this.session = null
    },
  }
}

beforeEach(() => {
  FakeBroadcastChannel.channels = []
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
})

test('tabs exchange in-memory sessions without Web Storage', async () => {
  const session = reactive({
    user: { id: '2', username: 'nomad' },
    accessToken: 'access-token',
    tokenType: 'Bearer',
    accessTokenExpiresIn: '15m',
  })
  const firstStore = createAuthStore(session)
  const secondStore = createAuthStore()
  const firstSync = configureAuthTabSync(firstStore)
  const secondSync = configureAuthTabSync(secondStore)

  const received = await secondSync.requestPeerSession()

  expect(received).toEqual({ ...session })
  expect(secondStore.session).toEqual({ ...session })

  firstStore.publisher('clear')
  expect(secondStore.session).toBe(null)

  firstSync.close()
  secondSync.close()
})
