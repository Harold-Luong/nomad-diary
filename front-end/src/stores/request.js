import { toErrorDetails } from '@/utils/error.js'

export async function runStoreRequest(store, callback) {
  store.loading = true
  store.error = null

  try {
    return await callback()
  } catch (error) {
    store.error = toErrorDetails(error)
    throw error
  } finally {
    store.loading = false
  }
}
