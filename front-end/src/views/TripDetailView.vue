<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'

import { useTripsStore } from '@/stores/trips.js'
import { useTripStopsStore } from '@/stores/trip-stops.js'
import { useProvincesStore } from '@/stores/provinces.js'
import { TRIP_STATUS_LABEL } from '@/constants/domain.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { useFormValidation } from '@/composables/index.js'
import { tripStopSchema } from '@/schemas/index.js'
import { formatDate, formatDateTime } from '@/utils/date.js'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const tripsStore = useTripsStore()
const stopsStore = useTripStopsStore()
const provincesStore = useProvincesStore()
const { current: trip, loading: tripLoading, error: tripError } = storeToRefs(tripsStore)
const { loading: stopLoading, error: stopError } = storeToRefs(stopsStore)
const { items: provinces, places } = storeToRefs(provincesStore)
const stops = computed(() => stopsStore.forTrip(props.id))
const showStopForm = ref(false)
const editingStopId = ref(null)
const { validate, errorFor, resetValidation } = useFormValidation(tripStopSchema)
const stopForm = reactive({
    provinceId: '',
    placeSearch: '',
    placeId: '',
    arrivedAt: '',
    departedAt: '',
    title: '',
    note: '',
})

function toLocalDateTime(value) {
    if (!value) return ''
    const date = new Date(value)
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return localDate.toISOString().slice(0, 16)
}

function toApiDateTime(value) {
    return value ? new Date(value).toISOString() : null
}

function resetStopForm() {
    Object.assign(stopForm, {
        provinceId: '',
        placeSearch: '',
        placeId: '',
        arrivedAt: '',
        departedAt: '',
        title: '',
        note: '',
    })
    editingStopId.value = null
    showStopForm.value = false
    provincesStore.clearPlaces()
    resetValidation()
}

async function loadPlaces() {
    stopForm.placeId = ''
    stopForm.placeSearch = ''
    provincesStore.clearPlaces()
    if (stopForm.provinceId) {
        await provincesStore.fetchPlaces(stopForm.provinceId, { page: 1, pageSize: 100 })
    }
}

async function searchPlaces() {
    stopForm.placeId = ''
    if (!stopForm.provinceId) return
    await provincesStore.fetchPlaces(stopForm.provinceId, {
        search: stopForm.placeSearch,
        page: 1,
        pageSize: 100,
    })
}

async function startEditing(stop) {
    showStopForm.value = true
    editingStopId.value = stop.id
    Object.assign(stopForm, {
        provinceId: String(stop.place.provinceId),
        placeSearch: '',
        placeId: String(stop.placeId),
        arrivedAt: toLocalDateTime(stop.arrivedAt),
        departedAt: toLocalDateTime(stop.departedAt),
        title: stop.title || '',
        note: stop.note || '',
    })
    await provincesStore.fetchPlaces(stop.place.provinceId, { page: 1, pageSize: 100 })
}

async function saveStop() {
    const payload = validate({
        placeId: stopForm.placeId,
        arrivedAt: toApiDateTime(stopForm.arrivedAt),
        departedAt: toApiDateTime(stopForm.departedAt),
        title: stopForm.title,
        note: stopForm.note,
    })
    if (!payload) return

    if (editingStopId.value) {
        await stopsStore.updateStop(editingStopId.value, payload)
    } else {
        await stopsStore.createStop(props.id, payload)
    }
    resetStopForm()
}

async function removeStop(stop) {
    if (!window.confirm(`Xóa trạm dừng “${stop.title || stop.place.name}” khỏi hành trình?`)) return
    await stopsStore.deleteStop(stop.id)
}

async function moveStop(index, direction) {
    const destination = index + direction
    if (destination < 0 || destination >= stops.value.length) return
    const reordered = [...stops.value]
    const [moving] = reordered.splice(index, 1)
    reordered.splice(destination, 0, moving)
    await stopsStore.reorderStops(
        props.id,
        reordered.map((stop, stopIndex) => ({ id: stop.id, visitOrder: stopIndex + 1 })),
    )
}

async function removeTrip() {
    if (!window.confirm(`Xóa chuyến đi “${trip.value.title}”? Hành động này sẽ ẩn toàn bộ hành trình.`)) return
    await tripsStore.deleteTrip(props.id)
    await router.replace({ name: ROUTE_NAME.TRIPS })
}

onMounted(async () => {
    await Promise.all([
        tripsStore.fetchTrip(props.id),
        stopsStore.fetchForTrip(props.id),
        provincesStore.fetchProvinces({ countryCode: 'VN', page: 1, pageSize: 100 }),
    ])
})
</script>

<template>
    <main class="page-shell">
        <RouterLink class="back-link" :to="{ name: ROUTE_NAME.TRIPS }">← Trở lại các cung đường</RouterLink>
        <p v-if="tripLoading && !trip" class="empty-state">Đang tìm đúng trang sổ...</p>
        <p v-else-if="tripError" class="form-error">{{ tripError.message }}</p>

        <template v-else-if="trip">
            <section class="trip-detail-hero" :class="{ 'has-cover': trip.thumbnailUrl }">
                <div v-if="trip.thumbnailUrl" class="trip-detail-image" :style="{ backgroundImage: `url(${trip.thumbnailUrl})` }"></div>
                <div class="trip-detail-copy">
                    <div class="detail-kicker">
                        <span class="trip-status" :class="`trip-status-${trip.status}`">{{ TRIP_STATUS_LABEL[trip.status] }}</span>
                        <span>HÀNH TRÌNH #{{ trip.id }}</span>
                    </div>
                    <h1 class="page-title">{{ trip.title }}</h1>
                    <p class="page-intro">{{ trip.description || 'Chưa có lời mở đầu cho hành trình này.' }}</p>
                    <div class="actions">
                        <RouterLink class="button button-primary" :to="{ name: ROUTE_NAME.TRIP_EDIT, params: { id: trip.id } }">Chỉnh sửa sổ</RouterLink>
                        <RouterLink class="button button-secondary" :to="{ name: ROUTE_NAME.TRIP_IMAGES, params: { id: trip.id } }">Quản lý ảnh</RouterLink>
                        <button class="button button-danger-ghost" type="button" @click="removeTrip">Xóa chuyến đi</button>
                    </div>
                </div>
            </section>

            <section class="travel-stats trip-summary">
                <div><span>Khởi hành</span><strong class="stat-date">{{ formatDate(trip.startDate) }}</strong></div>
                <div><span>Kết thúc</span><strong class="stat-date">{{ formatDate(trip.endDate) }}</strong></div>
                <div><span>Trạm dừng</span><strong>{{ stops.length }}</strong></div>
                <div><span>Chia sẻ</span><strong class="stat-date">{{ trip.isPublic ? 'Công khai' : 'Riêng tư' }}</strong></div>
            </section>

            <section class="section-block itinerary-section">
                <div class="section-heading">
                    <div>
                        <p class="eyebrow">LỊCH TRÌNH</p>
                        <h2>Từng trạm trên cung đường</h2>
                    </div>
                    <button class="button button-primary" type="button" @click="showStopForm ? resetStopForm() : showStopForm = true">
                        {{ showStopForm ? 'Đóng biểu mẫu' : '+ Thêm trạm dừng' }}
                    </button>
                </div>

                <form v-if="showStopForm" class="form-card stop-form" @submit.prevent="saveStop">
                    <div class="form-section-title">
                        <span>⌖</span>
                        <h2>{{ editingStopId ? 'Sửa trạm dừng' : 'Ghim một trạm mới' }}</h2>
                    </div>
                    <div class="form-grid">
                        <label>
                            Tỉnh thành
                            <select v-model="stopForm.provinceId" required @change="loadPlaces">
                                <option value="">Chọn tỉnh thành</option>
                                <option v-for="province in provinces" :key="province.id" :value="String(province.id)">{{ province.name }}</option>
                            </select>
                        </label>
                        <label>
                            Địa điểm
                            <select v-model="stopForm.placeId" required :disabled="!stopForm.provinceId">
                                <option value="">Chọn địa điểm</option>
                                <option v-for="place in places" :key="place.id" :value="String(place.id)">{{ place.name }}</option>
                            </select>
                            <span v-if="errorFor('placeId')" class="field-error">{{ errorFor('placeId') }}</span>
                        </label>
                    </div>
                    <div class="inline-search">
                        <label>
                            Tìm nhanh trong tỉnh
                            <input v-model.trim="stopForm.placeSearch" :disabled="!stopForm.provinceId" placeholder="Tên địa điểm, quận huyện..." />
                        </label>
                        <button class="button button-secondary" :disabled="!stopForm.provinceId || stopLoading" type="button" @click="searchPlaces">Tìm địa điểm</button>
                    </div>
                    <label>
                        Tên riêng cho trạm
                        <input v-model.trim="stopForm.title" maxlength="255" placeholder="Ví dụ: Buổi sáng bên hồ..." />
                        <span v-if="errorFor('title')" class="field-error">{{ errorFor('title') }}</span>
                    </label>
                    <div class="form-grid">
                        <label>
                            Thời gian đến
                            <input v-model="stopForm.arrivedAt" type="datetime-local" />
                            <span v-if="errorFor('arrivedAt')" class="field-error">{{ errorFor('arrivedAt') }}</span>
                        </label>
                        <label>
                            Thời gian rời đi
                            <input v-model="stopForm.departedAt" type="datetime-local" />
                            <span v-if="errorFor('departedAt')" class="field-error">{{ errorFor('departedAt') }}</span>
                        </label>
                    </div>
                    <label>
                        Ghi chú dọc đường
                        <textarea v-model="stopForm.note" rows="3" placeholder="Đường vào, món nên thử, điều cần nhớ..."></textarea>
                        <span v-if="errorFor('note')" class="field-error">{{ errorFor('note') }}</span>
                    </label>
                    <p v-if="stopError" class="form-error">{{ stopError.message }}</p>
                    <div class="actions">
                        <button class="button button-primary" :disabled="stopLoading" type="submit">{{ stopLoading ? 'Đang ghim...' : editingStopId ? 'Lưu trạm dừng' : 'Ghim vào lịch trình' }}</button>
                        <button class="button button-secondary" type="button" @click="resetStopForm">Hủy</button>
                    </div>
                </form>

                <p v-if="stopError && !showStopForm" class="form-error">{{ stopError.message }}</p>
                <section v-if="stops.length === 0" class="empty-state empty-state-large">
                    <span>⌖</span>
                    <h2>Chưa có trạm dừng</h2>
                    <p>Chọn một tỉnh thành, tìm địa điểm và bắt đầu nối những chấm đầu tiên.</p>
                </section>

                <ol v-else class="timeline-list">
                    <li v-for="(stop, index) in stops" :key="stop.id" class="timeline-stop">
                        <div class="timeline-marker"><span>{{ stop.visitOrder }}</span></div>
                        <article class="stop-card">
                            <div class="stop-card-heading">
                                <div>
                                    <p class="stop-location">{{ stop.place.provinceName }} · {{ stop.place.provinceCode }}</p>
                                    <h3>{{ stop.title || stop.place.name }}</h3>
                                    <p v-if="stop.title" class="actual-place">⌖ {{ stop.place.name }}</p>
                                </div>
                                <div class="order-actions" aria-label="Sắp xếp trạm dừng">
                                    <button type="button" :disabled="index === 0 || stopLoading" aria-label="Đưa trạm lên" @click="moveStop(index, -1)">↑</button>
                                    <button type="button" :disabled="index === stops.length - 1 || stopLoading" aria-label="Đưa trạm xuống" @click="moveStop(index, 1)">↓</button>
                                </div>
                            </div>
                            <p class="stop-time">{{ formatDateTime(stop.arrivedAt) }} → {{ formatDateTime(stop.departedAt) }}</p>
                            <p class="stop-note">{{ stop.note || 'Chưa có ghi chú dọc đường.' }}</p>
                            <div class="stop-actions">
                                <RouterLink class="text-button" :to="{ name: ROUTE_NAME.TRIP_STOP_REVIEW, params: { tripStopId: stop.id } }">★ Đánh giá</RouterLink>
                                <RouterLink class="text-button" :to="{ name: ROUTE_NAME.TRIP_IMAGES, params: { id: trip.id }, query: { tripStopId: stop.id } }">▧ Ảnh của trạm</RouterLink>
                                <button class="text-button" type="button" @click="startEditing(stop)">Sửa trạm</button>
                                <button class="text-button danger-text" type="button" @click="removeStop(stop)">Xóa</button>
                            </div>
                        </article>
                    </li>
                </ol>
            </section>
        </template>
    </main>
</template>
