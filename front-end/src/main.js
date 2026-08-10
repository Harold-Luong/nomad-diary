import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth.js'
import router from '@/router/index.js'
import { configureAuthSessionRecovery } from '@/services/auth-session.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
const authStore = useAuthStore(pinia)
authStore.initialize()
configureAuthSessionRecovery(authStore, router)
app.use(router)
app.mount('#app')
