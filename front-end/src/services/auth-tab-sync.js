const CHANNEL_NAME = 'nomad-diary.auth'
const REFRESH_LOCK_NAME = 'nomad-diary.auth-refresh'
const SESSION_REQUEST_TIMEOUT_MS = 150

function toPlainSession(session) {
  if (!session) return null
  return JSON.parse(JSON.stringify(session))
}

export function configureAuthTabSync(authStore) {
  const withRefreshLock = (callback) => {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return navigator.locks.request(REFRESH_LOCK_NAME, callback)
    }

    return callback()
  }

  if (typeof BroadcastChannel === 'undefined') {
    return {
      requestPeerSession: async () => null,
      withRefreshLock,
      close: () => {},
    }
  }

  const channel = new BroadcastChannel(CHANNEL_NAME)
  const tabId = crypto.randomUUID()
  const pendingRequests = new Map()

  function publish(type, session = null, target = null, requestId = null) {
    channel.postMessage({
      type,
      session: toPlainSession(session),
      source: tabId,
      target,
      requestId,
    })
  }

  authStore.configureSessionPublisher((type, session) => publish(type, session))

  channel.addEventListener('message', (event) => {
    const message = event.data
    if (!message || message.source === tabId) return
    if (message.target && message.target !== tabId) return

    if (message.type === 'request') {
      const session = authStore.getSessionSnapshot()
      if (session?.accessToken && session.accessToken !== message.expiredAccessToken) {
        publish('session', session, message.source, message.requestId)
      }
      return
    }

    if (message.type === 'session' && message.session?.accessToken) {
      authStore.applySession(message.session, { broadcast: false })
      const pending = pendingRequests.get(message.requestId)
      if (pending) {
        clearTimeout(pending.timer)
        pendingRequests.delete(message.requestId)
        pending.resolve(message.session)
      }
      return
    }

    if (message.type === 'clear') {
      authStore.clearSession({ broadcast: false })
    }
  })

  function requestPeerSession(expiredAccessToken = null) {
    const requestId = crypto.randomUUID()

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId)
        resolve(null)
      }, SESSION_REQUEST_TIMEOUT_MS)

      pendingRequests.set(requestId, { resolve, timer })
      channel.postMessage({
        type: 'request',
        source: tabId,
        requestId,
        expiredAccessToken,
      })
    })
  }

  return {
    requestPeerSession,
    withRefreshLock,
    close() {
      authStore.configureSessionPublisher(null)
      for (const pending of pendingRequests.values()) {
        clearTimeout(pending.timer)
        pending.resolve(null)
      }
      pendingRequests.clear()
      channel.close()
    },
  }
}
