<script setup>
import { onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { useFormValidation } from '@/composables/index.js'
import { profileSchema } from '@/schemas/index.js'

const router = useRouter()
const authStore = useAuthStore()
const { user, loading, error } = storeToRefs(authStore)
const { validate, errorFor } = useFormValidation(profileSchema)
const saved = ref(false)
const deletePassword = ref('')
const form = reactive({ displayName: '', avatarUrl: '', bio: '' })

function hydrateForm() {
    Object.assign(form, {
        displayName: user.value?.displayName || '',
        avatarUrl: user.value?.avatarUrl || '',
        bio: user.value?.bio || '',
    })
}

async function submit() {
    const payload = validate(form)
    if (!payload) return
    await authStore.updateProfile(payload)
    saved.value = true
}

async function deleteAccount() {
    if (!deletePassword.value || !window.confirm('Xóa tài khoản và toàn bộ dữ liệu riêng của bạn?')) return
    await authStore.deleteAccount(deletePassword.value)
    await router.replace({ name: ROUTE_NAME.HOME })
}

onMounted(async () => {
    await authStore.fetchMe()
    hydrateForm()
})
</script>

<template>
    <main class="page-shell profile-layout">
        <aside class="profile-card">
            <div class="avatar-frame">
                <img v-if="user?.avatarUrl" :src="user.avatarUrl" :alt="user.displayName || user.username" />
                <span v-else>{{ (user?.displayName || user?.username || 'N').slice(0, 1).toUpperCase() }}</span>
            </div>
            <p class="eyebrow">CHỦ NHÂN CUỐN SỔ</p>
            <h1>{{ user?.displayName || user?.username }}</h1>
            <p>@{{ user?.username }}</p>
            <p>{{ user?.email }}</p>
            <RouterLink class="button button-secondary" :to="{ name: ROUTE_NAME.CHANGE_PASSWORD }">Đổi mật khẩu</RouterLink>
        </aside>

        <div class="profile-content">
            <section>
                <p class="eyebrow">HỒ SƠ LỮ HÀNH</p>
                <h2>Thông tin của bạn</h2>
                <p class="page-intro">Một vài dòng để cuốn nhật ký này mang đúng dấu ấn của chủ nhân.</p>
                <form class="form-card" @submit.prevent="submit">
                    <label>Tên hiển thị <input v-model.trim="form.displayName" /><span v-if="errorFor('displayName')" class="field-error">{{ errorFor('displayName') }}</span></label>
                    <label>Avatar URL <input v-model.trim="form.avatarUrl" type="url" placeholder="https://..." /><span v-if="errorFor('avatarUrl')" class="field-error">{{ errorFor('avatarUrl') }}</span></label>
                    <label>Giới thiệu <textarea v-model="form.bio" rows="5" placeholder="Bạn đi để tìm điều gì?"></textarea><span v-if="errorFor('bio')" class="field-error">{{ errorFor('bio') }}</span></label>
                    <p v-if="error" class="form-error">{{ error.message }}</p>
                    <p v-if="saved" class="success-note">Đã lưu thông tin vào sổ.</p>
                    <button class="button button-primary" :disabled="loading" type="submit">{{ loading ? 'Đang lưu...' : 'Lưu hồ sơ' }}</button>
                </form>
            </section>

            <section class="danger-zone">
                <p class="eyebrow">VÙNG NGUY HIỂM</p>
                <h2>Đóng cuốn sổ</h2>
                <p>Tài khoản sẽ bị xóa mềm và mọi phiên đăng nhập bị thu hồi.</p>
                <div class="danger-actions">
                    <input v-model="deletePassword" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu để xác nhận" />
                    <button class="button button-danger" :disabled="loading || !deletePassword" type="button" @click="deleteAccount">Xóa tài khoản</button>
                </div>
            </section>
        </div>
    </main>
</template>
