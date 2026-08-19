import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth.js'
import router from '@/router/index.js'
import { configureAuthSessionRecovery } from '@/services/auth-session.js'
import { configureAuthTabSync } from '@/services/auth-tab-sync.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
const authStore = useAuthStore(pinia)
const authTabSync = configureAuthTabSync(authStore)
await authStore.initialize(authTabSync)
configureAuthSessionRecovery(authStore, router, authTabSync)
app.use(router)
app.mount('#app')
