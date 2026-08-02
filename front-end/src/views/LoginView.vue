<script setup>
import { reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.js'
import { ROUTE_NAME, ROUTE_PATH } from '@/constants/routes.js'
import { useFormValidation } from '@/composables/index.js'
import { loginSchema } from '@/schemas/index.js'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { loading, error } = storeToRefs(authStore)
const form = reactive({ identifier: '', password: '' })
const { validate, errorFor } = useFormValidation(loginSchema)

async function submit() {
    const payload = validate(form)
    if (!payload) return

    await authStore.login(payload)
    const requestedPath = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const redirect = requestedPath.startsWith('/') ? requestedPath : ROUTE_PATH.TRIPS
    await router.replace(redirect)
}
</script>

<template>
    <main class="auth-page">
        <section class="auth-visual" aria-hidden="true">
            <span class="auth-stamp">NOMAD<br />DIARY</span>
            <div class="auth-mountains"><i></i><i></i><i></i></div>
            <p>KEEP<br />MOVING</p>
            <small>Đường dài bắt đầu từ một bước chân.</small>
        </section>

        <section class="auth-panel">
            <div class="auth-panel-inner">
                <p class="eyebrow">TRỞ LẠI CUNG ĐƯỜNG</p>
                <h1 class="page-title">Đăng nhập</h1>
                <p class="page-intro">Mở cuốn sổ của bạn và viết tiếp hành trình còn dang dở.</p>

                <form class="form-card auth-form" @submit.prevent="submit">
                    <label>
                        Email hoặc username
                        <input v-model.trim="form.identifier" required autocomplete="username" placeholder="nomad@example.com" />
                        <span v-if="errorFor('identifier')" class="field-error">{{ errorFor('identifier') }}</span>
                    </label>
                    <label>
                        Mật khẩu
                        <input v-model="form.password" required type="password" autocomplete="current-password" placeholder="••••••••" />
                        <span v-if="errorFor('password')" class="field-error">{{ errorFor('password') }}</span>
                    </label>
                    <p v-if="error" class="form-error">{{ error.message }}</p>
                    <button class="button button-primary button-wide" :disabled="loading" type="submit">
                        {{ loading ? 'Đang mở sổ...' : 'Mở sổ hành trình' }}
                    </button>
                </form>

                <p class="form-footer">Chưa có cuốn sổ riêng? <RouterLink :to="{ name: ROUTE_NAME.REGISTER }">Bắt đầu lên đường</RouterLink></p>
            </div>
        </section>
    </main>
</template>
