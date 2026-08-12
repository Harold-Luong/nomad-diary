<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useTripsStore } from '@/stores/trips.js'
import { EDITOR_MODE } from '@/constants/app.js'
import { TRIP_STATUS, TRIP_STATUS_OPTIONS } from '@/constants/domain.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { useFormValidation } from '@/composables/index.js'
import { tripSchema } from '@/schemas/index.js'
import { toDateInputValue } from '@/utils/date.js'
import { slugify } from '@/utils/string.js'
import { UPLOAD_PURPOSE } from '@/constants/app.js'
import UploadProgress from '@/components/UploadProgress.vue'
import { useImageUpload } from '@/composables/useImageUpload.js'

const props = defineProps({ id: { type: String, default: null } })
const route = useRoute()
const router = useRouter()
const tripsStore = useTripsStore()
const { loading, error } = storeToRefs(tripsStore)
const isEdit = computed(() => route.meta.mode === EDITOR_MODE.EDIT)
const slugEdited = ref(false)
const selectedCoverFile = ref(null)
const coverPreviewUrl = ref(null)
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
const { validate, errorFor } = useFormValidation(tripSchema)
const form = reactive({
    title: '',
    slug: '',
    description: '',
    thumbnailObjectKey: null,
    status: TRIP_STATUS.DRAFT,
    startDate: '',
    endDate: '',
    isPublic: false,
})

watch(
    () => form.title,
    (title) => {
        if (!isEdit.value && !slugEdited.value) form.slug = slugify(title)
    },
)

onMounted(async () => {
    if (!isEdit.value) return
    const trip = await tripsStore.fetchTrip(props.id)
    Object.assign(form, {
        title: trip.title,
        slug: trip.slug,
        description: trip.description || '',
        thumbnailObjectKey: trip.thumbnailObjectKey || null,
        status: trip.status,
        startDate: toDateInputValue(trip.startDate),
        endDate: toDateInputValue(trip.endDate),
        isPublic: trip.isPublic,
    })
    coverPreviewUrl.value = trip.thumbnailUrl || null
    slugEdited.value = true
})

function releaseLocalPreview() {
    if (coverPreviewUrl.value?.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreviewUrl.value)
    }
}

function selectCover(event) {
    const file = event.target.files?.[0] || null
    if (!file) return

    releaseLocalPreview()
    selectedCoverFile.value = file
    coverPreviewUrl.value = URL.createObjectURL(file)
    resetUpload()
}

async function submit() {
    let payload = validate(form)
    if (!payload) return

    try {
        if (selectedCoverFile.value) {
            const image = await upload(
                selectedCoverFile.value,
                UPLOAD_PURPOSE.TRIP_COVER,
            )
            form.thumbnailObjectKey = image.objectKey
            selectedCoverFile.value = null
            payload = {
                ...payload,
                thumbnailObjectKey: image.objectKey,
            }
        }

        const trip = isEdit.value
            ? await tripsStore.updateTrip(props.id, payload)
            : await tripsStore.createTrip(payload)
        if (uploadStatus.value !== 'idle') completeUpload()
        await router.replace({ name: ROUTE_NAME.TRIP_DETAIL, params: { id: trip.id } })
    } catch (requestError) {
        if (uploadStatus.value !== 'idle') failUpload(requestError)
    }
}

onBeforeUnmount(releaseLocalPreview)
</script>

<template>
    <main class="page-shell editor-layout">
        <aside class="editor-aside">
            <RouterLink class="back-link" :to="isEdit ? { name: ROUTE_NAME.TRIP_DETAIL, params: { id } } : { name: ROUTE_NAME.TRIPS }">
                ← Quay lại sổ tay
            </RouterLink>
            <p class="eyebrow">{{ isEdit ? 'CHỈNH LẠI CUNG ĐƯỜNG' : 'TRANG GIẤY MỚI' }}</p>
            <h1 class="page-title">{{ isEdit ? 'Sửa chuyến đi' : 'Ghi chuyến mới' }}</h1>
            <p class="page-intro">Đánh dấu ngày đi, viết vài dòng mở đầu và để hành trình tự kể phần còn lại.</p>
            <div class="editor-tip">
                <span>✦</span>
                <p><strong>Mẹo nhỏ</strong> Slug được tạo tự động từ tiêu đề và dùng làm dấu nhận diện riêng cho chuyến đi.</p>
            </div>
        </aside>

        <form class="form-card travel-form" @submit.prevent="submit">
            <div class="form-section-title"><span>01</span><h2>Thông tin hành trình</h2></div>
            <label>
                Tên chuyến đi
                <input v-model.trim="form.title" required maxlength="255" placeholder="Đà Lạt những ngày mưa..." />
                <span v-if="errorFor('title')" class="field-error">{{ errorFor('title') }}</span>
            </label>
            <label>
                Slug
                <input v-model.trim="form.slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" @input="slugEdited = true" />
                <span v-if="errorFor('slug')" class="field-error">{{ errorFor('slug') }}</span>
            </label>
            <label>
                Lời mở đầu
                <textarea v-model="form.description" rows="5" placeholder="Vì sao bạn lên đường, điều gì đáng nhớ..."></textarea>
                <span v-if="errorFor('description')" class="field-error">{{ errorFor('description') }}</span>
            </label>
            <label>
                Ảnh bìa
                <div v-if="coverPreviewUrl" class="image-upload-preview image-upload-preview-cover">
                    <img :src="coverPreviewUrl" alt="Xem trước ảnh bìa" />
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="uploading" @change="selectCover" />
                <small>JPEG, PNG, WebP hoặc AVIF, tối đa 10 MB. Ảnh sẽ được tải trực tiếp lên S3 khi lưu chuyến đi.</small>
                <span v-if="errorFor('thumbnailObjectKey')" class="field-error">{{ errorFor('thumbnailObjectKey') }}</span>
            </label>
            <UploadProgress
                :status="uploadStatus"
                :progress="uploadProgress"
                :file-name="uploadFileName"
            />

            <div class="form-section-title"><span>02</span><h2>Thời gian &amp; trạng thái</h2></div>
            <div class="form-grid">
                <label>
                    Ngày bắt đầu
                    <input v-model="form.startDate" type="date" />
                    <span v-if="errorFor('startDate')" class="field-error">{{ errorFor('startDate') }}</span>
                </label>
                <label>
                    Ngày kết thúc
                    <input v-model="form.endDate" type="date" />
                    <span v-if="errorFor('endDate')" class="field-error">{{ errorFor('endDate') }}</span>
                </label>
            </div>
            <label>
                Trạng thái chuyến đi
                <select v-model.number="form.status">
                    <option v-for="status in TRIP_STATUS_OPTIONS" :key="status.value" :value="status.value">{{ status.label }}</option>
                </select>
                <span v-if="errorFor('status')" class="field-error">{{ errorFor('status') }}</span>
            </label>
            <label class="checkbox-label paper-check">
                <input v-model="form.isPublic" type="checkbox" />
                <span><strong>Chia sẻ công khai</strong><small>Cho phép hành trình này được hiển thị công khai.</small></span>
            </label>
            <p v-if="uploadError || error" class="form-error">{{ (uploadError || error).message }}</p>
            <button class="button button-primary button-wide" :disabled="loading || uploading" type="submit">
                {{ loading || uploading ? 'Đang đóng dấu...' : isEdit ? 'Lưu thay đổi' : 'Tạo hành trình' }}
            </button>
        </form>
    </main>
</template>
