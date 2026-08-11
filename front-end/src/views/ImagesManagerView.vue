<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute } from 'vue-router'

import UploadProgress from '@/components/UploadProgress.vue'
import { uploadsApi } from '@/api/uploads.js'
import { useImagesStore } from '@/stores/images.js'
import { useTripsStore } from '@/stores/trips.js'
import { useTripStopsStore } from '@/stores/trip-stops.js'
import {
    IMAGE_CONTENT_TYPES,
    IMAGE_MAX_SIZE_BYTES,
    UPLOAD_PURPOSE,
} from '@/constants/app.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { formatDateTime } from '@/utils/date.js'
import { getErrorMessage } from '@/utils/error.js'
import { readImageMetadata } from '@/utils/image-metadata.js'

const props = defineProps({ id: { type: String, required: true } })
const route = useRoute()
const tripsStore = useTripsStore()
const stopsStore = useTripStopsStore()
const imagesStore = useImagesStore()
const { current: trip, loading: tripLoading, error: tripError } = storeToRefs(tripsStore)
const { loading: stopsLoading } = storeToRefs(stopsStore)
const {
    items: images,
    meta,
    loading: imagesLoading,
    error: imagesError,
} = storeToRefs(imagesStore)
const stops = computed(() => stopsStore.forTrip(props.id))

const filters = reactive({
    tripStopId: '',
    favorite: '',
    sort: 'createdAtDesc',
    page: 1,
})
const uploadDefaults = reactive({
    tripStopId: '',
})
const queue = ref([])
const batchUploading = ref(false)
const editingImageId = ref(null)
const editForm = reactive({ description: '', tripStopId: '' })
const lightboxImage = ref(null)
let queueId = 0

const pageFavoriteCount = computed(() =>
    images.value.filter((image) => image.isFavorite).length,
)
const canUpload = computed(() =>
    queue.value.some((item) => !item.invalid && item.status !== 'success') &&
    queue.value.every((item) => item.metadataStatus !== 'reading'),
)

function stopLabel(stop) {
    return stop.title || stop.place?.name || `Trạm #${stop.id}`
}

function imageLocation(image) {
    if (!image.tripStopId) return 'Ảnh chung của chuyến đi'
    const stop = stops.value.find(
        (item) => String(item.id) === String(image.tripStopId),
    )
    return stop ? stopLabel(stop) : image.place?.name || `Trạm #${image.tripStopId}`
}

function formatFileSize(bytes) {
    if (!Number.isFinite(Number(bytes))) return 'Không rõ dung lượng'
    const megabytes = Number(bytes) / (1024 * 1024)
    return megabytes >= 1
        ? `${megabytes.toFixed(1)} MB`
        : `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`
}

function validateSelectedFile(file) {
    if (!IMAGE_CONTENT_TYPES.includes(file.type)) {
        return 'Chỉ hỗ trợ JPEG, PNG, WebP hoặc AVIF'
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
        return 'Tệp ảnh đang trống hoặc không thể đọc'
    }
    if (file.size > IMAGE_MAX_SIZE_BYTES) {
        return 'Ảnh không được vượt quá 10 MB'
    }
    return null
}

async function hydrateQueueMetadata(item) {
    if (item.invalid) return
    item.metadataStatus = 'reading'
    const metadata = await readImageMetadata(item.file)
    Object.assign(item, metadata, {
        keepLocation: metadata.latitude !== null && metadata.longitude !== null,
        metadataStatus: 'ready',
    })
}

function selectFiles(event) {
    const files = Array.from(event.target.files || [])
    const selectedTripStopId = uploadDefaults.tripStopId || null

    const additions = files.map((file) => {
        const validationError = validateSelectedFile(file)
        return {
            id: ++queueId,
            file,
            previewUrl: IMAGE_CONTENT_TYPES.includes(file.type)
                ? URL.createObjectURL(file)
                : null,
            tripStopId: selectedTripStopId,
            description: '',
            capturedAt: null,
            manualCapturedAt: '',
            latitude: null,
            longitude: null,
            width: null,
            height: null,
            keepLocation: false,
            metadataStatus: validationError ? 'unavailable' : 'reading',
            objectKey: null,
            progress: 0,
            status: validationError ? 'error' : 'idle',
            error: validationError,
            invalid: Boolean(validationError),
        }
    })

    const firstAddedIndex = queue.value.length
    queue.value.push(...additions)

    // Read metadata through the reactive queue proxies so the UI updates as
    // soon as each asynchronous read finishes.
    queue.value.slice(firstAddedIndex).forEach(hydrateQueueMetadata)
    event.target.value = ''
}

function releaseQueuePreview(item) {
    if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
    item.previewUrl = null
}

function removeQueued(item) {
    releaseQueuePreview(item)
    queue.value = queue.value.filter((queued) => queued.id !== item.id)
}

function clearCompleted() {
    queue.value
        .filter((item) => item.status === 'success')
        .forEach(releaseQueuePreview)
    queue.value = queue.value.filter((item) => item.status !== 'success')
}

function toCapturedAt(value) {
      return value ? new Date(value).toISOString() : null
} 

async function uploadItem(item) {
    item.error = null

    try {
        if (!item.objectKey) {
            item.status = 'preparing'
            const uploaded = await uploadsApi.uploadImage(
                item.file,
                UPLOAD_PURPOSE.IMAGES,
                {
                    onProgress(value) {
                        item.progress = value
                        item.status = 'uploading'
                    },
                },
            )
            item.objectKey = uploaded.objectKey
        }

        item.progress = 100
        item.status = 'saving'
        await imagesStore.createImage({
            tripId: String(props.id),
            tripStopId: item.tripStopId ? String(item.tripStopId) : null,
            imageObjectKey: item.objectKey,
            thumbnailObjectKey: null,
            originalFilename: item.file.name,
            description: item.description.trim() || null,
            capturedAt: item.capturedAt || toCapturedAt(item.manualCapturedAt),
            latitude: item.keepLocation ? item.latitude : null,
            longitude: item.keepLocation ? item.longitude : null,
            width: item.width,
            height: item.height,
            fileSize: item.file.size,
            mimeType: item.file.type,
            isCover: false,
            isFavorite: false,
        })
        item.status = 'success'
    } catch (error) {
        item.status = 'error'
        item.error = getErrorMessage(error, 'Không thể lưu ảnh')
    }
}

async function uploadAll() {
    if (!canUpload.value || batchUploading.value) return
    batchUploading.value = true

    try {
        for (const item of queue.value) {
            if (!item.invalid && item.status !== 'success') {
                await uploadItem(item)
            }
        }
        await loadImages(filters.page)
    } finally {
        batchUploading.value = false
    }
}

function listFilters(page = filters.page) {
    return {
        tripId: String(props.id),
        tripStopId: filters.tripStopId || undefined,
        favorite: filters.favorite === '' ? undefined : filters.favorite,
        sort: filters.sort,
        page,
        pageSize: 24,
    }
}

async function loadImages(page = 1) {
    filters.page = page
    await imagesStore.fetchImages(listFilters(page))
}

async function toggleFavorite(image) {
    await imagesStore.updateImage(image.id, { isFavorite: !image.isFavorite })
}

function startEditing(image) {
    editingImageId.value = image.id
    editForm.description = image.description || ''
    editForm.tripStopId = image.tripStopId || ''
}

function cancelEditing() {
    editingImageId.value = null
    editForm.description = ''
    editForm.tripStopId = ''
}

async function saveImage(image) {
    await imagesStore.updateImage(image.id, {
        description: editForm.description.trim() || null,
        tripStopId: editForm.tripStopId ? String(editForm.tripStopId) : null,
    })
    cancelEditing()
}

async function removeImage(image) {
    if (!window.confirm(`Xóa ảnh “${image.originalFilename || `#${image.id}`}” khỏi nhật ký?`)) return
    await imagesStore.deleteImage(image.id)
    if (images.value.length === 0 && filters.page > 1) {
        await loadImages(filters.page - 1)
    }
}

onMounted(async () => {
    await Promise.all([
        tripsStore.fetchTrip(props.id),
        stopsStore.fetchForTrip(props.id),
    ])

    const requestedStopId = String(route.query.tripStopId || '')
    if (stops.value.some((stop) => String(stop.id) === requestedStopId)) {
        filters.tripStopId = requestedStopId
        uploadDefaults.tripStopId = requestedStopId
    }

    await loadImages(1)
})

onBeforeUnmount(() => queue.value.forEach(releaseQueuePreview))
</script>

<template>
    <main class="page-shell image-manager-page">
        <RouterLink class="back-link" :to="{ name: ROUTE_NAME.TRIP_DETAIL, params: { id } }">
            ← Trở lại hành trình
        </RouterLink>

        <p v-if="tripLoading && !trip" class="empty-state">Đang mở hộp ảnh...</p>
        <p v-else-if="tripError" class="form-error">{{ tripError.message }}</p>

        <template v-else-if="trip">
            <header class="image-manager-hero">
                <div>
                    <p class="eyebrow">HỘP ẢNH DỌC ĐƯỜNG</p>
                    <h1 class="page-title">Ảnh của {{ trip.title }}</h1>
                    <p class="page-intro">
                        Lưu ảnh thực tế của cả chuyến đi hoặc gắn từng khoảnh khắc vào đúng trạm dừng.
                    </p>
                </div>
                <div class="image-manager-summary" aria-label="Tóm tắt thư viện ảnh">
                    <span><strong>{{ meta.total }}</strong> ảnh</span>
                    <span><strong>{{ pageFavoriteCount }}</strong> yêu thích trên trang</span>
                    <span><strong>{{ stops.length }}</strong> trạm dừng</span>
                </div>
            </header>

            <section class="image-upload-panel">
                <div class="section-heading">
                    <div>
                        <p class="eyebrow">THÊM KHOẢNH KHẮC</p>
                        <h2>Tải ảnh vào nhật ký</h2>
                    </div>
                    <span class="upload-limit">JPEG · PNG · WebP · AVIF · tối đa 10 MB/ảnh</span>
                </div>

                <div class="image-upload-controls">
                    <label>
                        Ảnh thuộc trạm nào?
                        <select v-model="uploadDefaults.tripStopId" :disabled="batchUploading || stopsLoading">
                            <option value="">Ảnh chung của chuyến đi</option>
                            <option v-for="stop in stops" :key="stop.id" :value="String(stop.id)">
                                {{ stop.visitOrder }}. {{ stopLabel(stop) }}
                            </option>
                        </select>
                    </label>
                    <label class="image-file-drop">
                        <span>＋ Chọn một hoặc nhiều ảnh</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple
                            :disabled="batchUploading" @change="selectFiles" />
                    </label>
                </div>

                <div v-if="queue.length" class="image-upload-queue">
                    <article v-for="item in queue" :key="item.id" class="image-queue-item">
                        <div class="image-queue-preview">
                            <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.file.name" />
                            <span v-else>Không có preview</span>
                        </div>
                        <div class="image-queue-body">
                            <div class="image-queue-title">
                                <div>
                                    <strong>{{ item.file.name }}</strong>
                                    <small>{{ formatFileSize(item.file.size) }} · {{ item.tripStopId ? imageLocation({
                                        tripStopId: item.tripStopId
                                    }) : 'Ảnh chung' }}</small>
                                </div>
                                <button class="text-button danger-text" type="button" :disabled="batchUploading"
                                    @click="removeQueued(item)">Bỏ</button>
                            </div>
                            <label>
                                Chú thích ảnh
                                <input v-model="item.description" maxlength="20000"
                                    :disabled="batchUploading || item.status === 'success'"
                                    placeholder="Một câu chuyện ngắn về khoảnh khắc này..." />
                            </label>
                            <div class="image-metadata-box">
                                <p v-if="item.metadataStatus === 'reading'">Đang đọc ngày chụp và vị trí từ ảnh, tối đa
                                    5 giây…</p>
                                <template v-else-if="!item.invalid">
                                    <p v-if="item.capturedAt">
                                        <span>Thời gian từ ảnh</span>
                                        <strong>{{ formatDateTime(item.capturedAt) }}</strong>
                                    </p>
                                    <label v-else>
                                        Không đọc được thời gian chụp — chọn thủ công
                                        <input v-model="item.manualCapturedAt" type="datetime-local"
                                            :disabled="batchUploading || item.status === 'success'" />
                                    </label>
                                    <label v-if="item.latitude !== null && item.longitude !== null"
                                        class="image-location-consent">
                                        <input v-model="item.keepLocation" type="checkbox"
                                            :disabled="batchUploading || item.status === 'success'" />
                                        <span>
                                            <strong>Lưu vị trí từ ảnh</strong>
                                            <small>{{ item.latitude.toFixed(5) }}, {{ item.longitude.toFixed(5)
                                                }}</small>
                                        </span>
                                    </label>
                                    <p v-else><span>Vị trí</span><strong>Không có GPS trong ảnh</strong></p>
                                    <p v-if="item.width && item.height">
                                        <span>Kích thước</span>
                                        <strong>{{ item.width }} × {{ item.height }} px</strong>
                                    </p>
                                </template>
                            </div>
                            <UploadProgress :status="item.status" :progress="item.progress"
                                :file-name="item.file.name" />
                            <p v-if="item.error" class="field-error">{{ item.error }}</p>
                        </div>
                    </article>
                </div>

                <div v-if="queue.length" class="image-upload-actions">
                    <button class="button button-primary" type="button" :disabled="!canUpload || batchUploading"
                        @click="uploadAll">
                        {{ batchUploading ? 'Đang lưu từng khoảnh khắc...' : 'Tải và lưu tất cả' }}
                    </button>
                    <button class="button button-secondary" type="button" :disabled="batchUploading"
                        @click="clearCompleted">
                        Dọn ảnh đã hoàn tất
                    </button>
                </div>
            </section>

            <section class="section-block image-library-section">
                <div class="section-heading">
                    <div>
                        <p class="eyebrow">THƯ VIỆN HÀNH TRÌNH</p>
                        <h2>Những nơi đã đi qua</h2>
                    </div>
                </div>

                <form class="image-filter-bar" @submit.prevent="loadImages(1)">
                    <label>
                        Trạm dừng
                        <select v-model="filters.tripStopId">
                            <option value="">Tất cả ảnh trong chuyến đi</option>
                            <option v-for="stop in stops" :key="stop.id" :value="String(stop.id)">
                                {{ stop.visitOrder }}. {{ stopLabel(stop) }}
                            </option>
                        </select>
                    </label>
                    <label>
                        Yêu thích
                        <select v-model="filters.favorite">
                            <option value="">Tất cả</option>
                            <option value="true">Chỉ ảnh yêu thích</option>
                            <option value="false">Chưa yêu thích</option>
                        </select>
                    </label>
                    <label>
                        Sắp xếp
                        <select v-model="filters.sort">
                            <option value="createdAtDesc">Mới thêm gần đây</option>
                            <option value="createdAtAsc">Cũ nhất trước</option>
                            <option value="capturedAtDesc">Chụp gần đây</option>
                            <option value="capturedAtAsc">Chụp lâu nhất</option>
                        </select>
                    </label>
                    <button class="button button-secondary" type="submit" :disabled="imagesLoading">Lọc ảnh</button>
                </form>

                <p v-if="imagesError" class="form-error">{{ imagesError.message }}</p>
                <p v-if="imagesLoading && !images.length" class="empty-state">Đang rửa những tấm ảnh...</p>

                <section v-else-if="!images.length" class="empty-state empty-state-large">
                    <span>▧</span>
                    <h2>Chưa có ảnh trên cung đường này</h2>
                    <p>Chọn ảnh phía trên và gắn chúng vào chuyến đi hoặc một trạm dừng.</p>
                </section>

                <div v-else class="journey-gallery">
                    <article v-for="image in images" :key="image.id" class="journey-image-card">
                        <button class="journey-image-preview" type="button" @click="lightboxImage = image">
                            <img :src="image.thumbnailUrl || image.imageUrl"
                                :alt="image.description || image.originalFilename || 'Ảnh hành trình'" loading="lazy" />
                            <span v-if="image.isFavorite" class="favorite-badge" aria-label="Ảnh yêu thích">★</span>
                        </button>
                        <div class="journey-image-copy">
                            <p class="image-location">⌖ {{ imageLocation(image) }}</p>
                            <p class="image-description">{{ image.description || 'Chưa có chú thích cho khoảnh khắc này.' }}</p>
                            <small>{{ formatDateTime(image.capturedAt || image.createdAt) }} · {{
                                formatFileSize(image.fileSize)
                                }}</small>

                            <form v-if="String(editingImageId) === String(image.id)" class="image-inline-editor"
                                @submit.prevent="saveImage(image)">
                                <label>
                                    Chú thích
                                    <textarea v-model="editForm.description" rows="3" maxlength="20000"></textarea>
                                </label>
                                <label>
                                    Gắn với trạm
                                    <select v-model="editForm.tripStopId">
                                        <option value="">Ảnh chung của chuyến đi</option>
                                        <option v-for="stop in stops" :key="stop.id" :value="String(stop.id)">
                                            {{ stop.visitOrder }}. {{ stopLabel(stop) }}
                                        </option>
                                    </select>
                                </label>
                                <div class="actions">
                                    <button class="button button-primary" type="submit"
                                        :disabled="imagesLoading">Lưu</button>
                                    <button class="button button-secondary" type="button"
                                        @click="cancelEditing">Hủy</button>
                                </div>
                            </form>

                            <div v-else class="journey-image-actions">
                                <button class="text-button" type="button" :disabled="imagesLoading"
                                    @click="toggleFavorite(image)">
                                    {{ image.isFavorite ? '☆ Bỏ yêu thích' : '★ Yêu thích' }}
                                </button>
                                <button class="text-button" type="button" @click="startEditing(image)">Sửa</button>
                                <button class="text-button danger-text" type="button" :disabled="imagesLoading"
                                    @click="removeImage(image)">Xóa</button>
                            </div>
                        </div>
                    </article>
                </div>

                <div v-if="meta.totalPages > 1" class="pagination">
                    <button class="button button-secondary" type="button" :disabled="filters.page <= 1 || imagesLoading"
                        @click="loadImages(filters.page - 1)">← Trang trước</button>
                    <span>Trang {{ meta.page }} / {{ meta.totalPages }}</span>
                    <button class="button button-secondary" type="button"
                        :disabled="filters.page >= meta.totalPages || imagesLoading"
                        @click="loadImages(filters.page + 1)">Trang sau
                        →</button>
                </div>
            </section>
        </template>

        <div v-if="lightboxImage" class="image-lightbox" role="dialog" aria-modal="true" aria-label="Xem ảnh lớn"
            @click.self="lightboxImage = null">
            <button class="image-lightbox-close" type="button" aria-label="Đóng ảnh"
                @click="lightboxImage = null">×</button>
            <img :src="lightboxImage.imageUrl"
                :alt="lightboxImage.description || lightboxImage.originalFilename || 'Ảnh hành trình'" />
            <div>
                <strong>{{ imageLocation(lightboxImage) }}</strong>
                <span>{{ lightboxImage.description || lightboxImage.originalFilename }}</span>
            </div>
        </div>
    </main>
</template>
