<script setup>
import { reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { useFormValidation } from '@/composables/index.js'
import { registerSchema } from '@/schemas/index.js'

const router = useRouter()
const authStore = useAuthStore()
const { loading, error } = storeToRefs(authStore)
const form = reactive({ username: '', email: '', password: '', displayName: '' })
const { validate, errorFor } = useFormValidation(registerSchema)

async function submit() {
    const payload = validate({ ...form, displayName: form.displayName || form.username })
    if (!payload) return
    await authStore.register(payload)
    await router.replace({ name: ROUTE_NAME.TRIPS })
}
</script>

<template>
    <main class="auth-page auth-page-register">
        <section class="auth-visual" aria-hidden="true">
            <span class="auth-stamp">FIRST<br />MILE</span>
            <div class="auth-mountains"><i></i><i></i><i></i></div>
            <p>GO<br />WANDER</p>
            <small>Mang theo ít hành lý, đem về nhiều câu chuyện.</small>
        </section>

        <section class="auth-panel">
            <div class="auth-panel-inner">
                <p class="eyebrow">TRANG GIẤY ĐẦU TIÊN</p>
                <h1 class="page-title">Tạo tài khoản</h1>
                <p class="page-intro">Sắm một cuốn sổ số cho mọi chuyến đi từ hôm nay.</p>

                <form class="form-card auth-form" @submit.prevent="submit">
                    <div class="form-grid">
                        <label>
                            Username
                            <input v-model.trim="form.username" required minlength="3" autocomplete="username" placeholder="nomad_92" />
                            <span v-if="errorFor('username')" class="field-error">{{ errorFor('username') }}</span>
                        </label>
                        <label>
                            Tên hiển thị
                            <input v-model.trim="form.displayName" autocomplete="name" placeholder="Một người mê đi" />
                            <span v-if="errorFor('displayName')" class="field-error">{{ errorFor('displayName') }}</span>
                        </label>
                    </div>
                    <label>
                        Email
                        <input v-model.trim="form.email" required type="email" autocomplete="email" placeholder="nomad@example.com" />
                        <span v-if="errorFor('email')" class="field-error">{{ errorFor('email') }}</span>
                    </label>
                    <label>
                        Mật khẩu
                        <input v-model="form.password" required minlength="8" type="password" autocomplete="new-password" placeholder="Tối thiểu 8 ký tự" />
                        <span v-if="errorFor('password')" class="field-error">{{ errorFor('password') }}</span>
                    </label>
                    <p v-if="error" class="form-error">{{ error.message }}</p>
                    <button class="button button-primary button-wide" :disabled="loading" type="submit">{{ loading ? 'Đang đóng dấu...' : 'Tạo sổ hành trình' }}</button>
                </form>

                <p class="form-footer">Đã có tài khoản? <RouterLink :to="{ name: ROUTE_NAME.LOGIN }">Đăng nhập</RouterLink></p>
            </div>
        </section>
    </main>
</template>
