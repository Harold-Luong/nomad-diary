<script setup>
import { reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { useFormValidation } from '@/composables/index.js'
import { changePasswordSchema } from '@/schemas/index.js'

const router = useRouter()
const authStore = useAuthStore()
const { loading, error } = storeToRefs(authStore)
const form = reactive({ currentPassword: '', newPassword: '' })
const { validate, errorFor } = useFormValidation(changePasswordSchema)

async function submit() {
    const payload = validate(form)
    if (!payload) return
    await authStore.changePassword(payload)
    await router.replace({ name: ROUTE_NAME.PROFILE })
}
</script>

<template>
    <main class="page-shell narrow-page security-page">
        <RouterLink class="back-link" :to="{ name: ROUTE_NAME.PROFILE }">← Trở lại hồ sơ</RouterLink>
        <div class="security-mark" aria-hidden="true">⌾</div>
        <p class="eyebrow">GIỮ CUỐN SỔ AN TOÀN</p>
        <h1 class="page-title">Đổi mật khẩu</h1>
        <p class="page-intro">Sau khi đổi, các phiên cũ sẽ được thu hồi và phiên hiện tại được làm mới.</p>

        <form class="form-card" @submit.prevent="submit">
            <label>Mật khẩu hiện tại <input v-model="form.currentPassword" required type="password" autocomplete="current-password" /><span v-if="errorFor('currentPassword')" class="field-error">{{ errorFor('currentPassword') }}</span></label>
            <label>Mật khẩu mới <input v-model="form.newPassword" required minlength="8" type="password" autocomplete="new-password" /><span v-if="errorFor('newPassword')" class="field-error">{{ errorFor('newPassword') }}</span></label>
            <p v-if="error" class="form-error">{{ error.message }}</p>
            <button class="button button-primary button-wide" :disabled="loading" type="submit">{{ loading ? 'Đang thay chìa khóa...' : 'Đổi mật khẩu' }}</button>
        </form>
    </main>
</template>
