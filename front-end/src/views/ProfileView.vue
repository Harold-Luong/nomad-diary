<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { useFormValidation } from '@/composables/index.js'
import { profileSchema } from '@/schemas/index.js'
import { UPLOAD_PURPOSE } from '@/constants/app.js'
import UploadProgress from '@/components/UploadProgress.vue'
import { useImageUpload } from '@/composables/useImageUpload.js'

const router = useRouter()
const authStore = useAuthStore()
const { user, loading, error } = storeToRefs(authStore)
const { validate, errorFor } = useFormValidation(profileSchema)
const saved = ref(false)
const deletePassword = ref('')
const selectedAvatarFile = ref(null)
const avatarPreviewUrl = ref(null)
const {
    status: uploadStatus,
    progress: uploadProgress,
    error: uploadError,
    fileName: uploadFileName,
    isProcessing: uploading,
    reset: resetUpload,
    upload,
    complete: completeUpload,
    fail: failUpload,
} = useImageUpload()
const form = reactive({
    displayName: '',
    avatarObjectKey: null,
    bio: '',
})

function hydrateForm() {
    Object.assign(form, {
        displayName: user.value?.displayName || '',
        avatarObjectKey: user.value?.avatarObjectKey || null,
        bio: user.value?.bio || '',
    })
    avatarPreviewUrl.value = user.value?.avatarUrl || null
}

function releaseLocalPreview() {
    if (avatarPreviewUrl.value?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl.value)
    }
}

function selectAvatar(event) {
    const file = event.target.files?.[0] || null
    if (!file) return

    releaseLocalPreview()
    selectedAvatarFile.value = file
    avatarPreviewUrl.value = URL.createObjectURL(file)
    resetUpload()
    saved.value = false
}

async function submit() {
    let payload = validate(form)
    if (!payload) return

    try {
        if (selectedAvatarFile.value) {
            const image = await upload(
                selectedAvatarFile.value,
                UPLOAD_PURPOSE.AVATAR,
            )
            form.avatarObjectKey = image.objectKey
            selectedAvatarFile.value = null
            payload = { ...payload, avatarObjectKey: image.objectKey }
        }

        const updatedUser = await authStore.updateProfile(payload)
        if (uploadStatus.value !== 'idle') completeUpload()
        releaseLocalPreview()
        avatarPreviewUrl.value = updatedUser.avatarUrl || null
        hydrateForm()
        saved.value = true
    } catch (requestError) {
        if (uploadStatus.value !== 'idle') failUpload(requestError)
    }
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

onBeforeUnmount(releaseLocalPreview)
</script>

<template>
    <main class="page-shell profile-layout">
        <aside class="profile-card">
            <div class="avatar-frame">
                <img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" :alt="user?.displayName || user?.username" />
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
                    <label class="image-upload-field">
                        Ảnh đại diện
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="uploading" @change="selectAvatar" />
                        <small>JPEG, PNG, WebP hoặc AVIF, tối đa 10 MB. Ảnh sẽ được tải trực tiếp lên S3 khi lưu hồ sơ.</small>
                        <span v-if="errorFor('avatarObjectKey')" class="field-error">{{ errorFor('avatarObjectKey') }}</span>
                    </label>
                    <UploadProgress
                        :status="uploadStatus"
                        :progress="uploadProgress"
                        :file-name="uploadFileName"
                    />
                    <label>Giới thiệu <textarea v-model="form.bio" rows="5" placeholder="Bạn đi để tìm điều gì?"></textarea><span v-if="errorFor('bio')" class="field-error">{{ errorFor('bio') }}</span></label>
                    <p v-if="uploadError || error" class="form-error">{{ (uploadError || error).message }}</p>
                    <p v-if="saved" class="success-note">Đã lưu thông tin vào sổ.</p>
                    <button class="button button-primary" :disabled="loading || uploading" type="submit">{{ loading || uploading ? 'Đang lưu...' : 'Lưu hồ sơ' }}</button>
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
