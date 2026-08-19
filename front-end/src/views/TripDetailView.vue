<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'

import { useTripsStore } from '@/stores/trips.js'
import { useTripStopsStore } from '@/stores/trip-stops.js'
import { locationCatalogApi } from '@/api/location-catalog.js'
import { placesApi } from '@/api/places.js'
import { TRIP_STATUS_LABEL } from '@/constants/domain.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { useFormValidation } from '@/composables/index.js'
import { tripStopSchema } from '@/schemas/index.js'
import { formatDate, formatDateTime } from '@/utils/date.js'
import { getErrorMessage } from '@/utils/error.js'
import {
    addPlaceSelectionValues,
    mergePlaceOptions,
    normalizePlaceName,
} from '@/utils/places.js'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const tripsStore = useTripsStore()
const stopsStore = useTripStopsStore()
const { current: trip, loading: tripLoading, error: tripError } = storeToRefs(tripsStore)
const { loading: stopLoading, error: stopError } = storeToRefs(stopsStore)
const stops = computed(() => stopsStore.forTrip(props.id))
const showStopForm = ref(false)
const editingStopId = ref(null)
const originalPlaceId = ref('')
const catalogProvinces = ref([])
const catalogWards = ref([])
const placeOptions = ref([])
const loadingCatalogProvinces = ref(false)
const loadingCatalogWards = ref(false)
const loadingCatalogPlaces = ref(false)
const catalogError = ref('')
let wardsRequestId = 0
let placesRequestId = 0
const { validate, errorFor, resetValidation } = useFormValidation(tripStopSchema)
const stopForm = reactive({
    provinceCode: '',
    wardCode: '',
    placeName: '',
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
    wardsRequestId += 1
    placesRequestId += 1
    Object.assign(stopForm, {
        provinceCode: '',
        wardCode: '',
        placeName: '',
        placeId: '',
        arrivedAt: '',
        departedAt: '',
        title: '',
        note: '',
    })
    editingStopId.value = null
    originalPlaceId.value = ''
    catalogWards.value = []
    placeOptions.value = []
    catalogError.value = ''
    loadingCatalogWards.value = false
    loadingCatalogPlaces.value = false
    showStopForm.value = false
    resetValidation()
}

function restoreOriginalPlace() {
    stopForm.placeId = editingStopId.value ? originalPlaceId.value : ''
}

async function loadCatalogProvinces() {
    loadingCatalogProvinces.value = true
    catalogError.value = ''

    try {
        catalogProvinces.value = await locationCatalogApi.listProvinces()
    } catch (requestError) {
        catalogError.value = getErrorMessage(requestError, 'Không tải được danh sách tỉnh/thành')
    } finally {
        loadingCatalogProvinces.value = false
    }
}

async function loadCatalogWards() {
    const provinceCode = stopForm.provinceCode
    const requestId = ++wardsRequestId
    placesRequestId += 1
    stopForm.wardCode = ''
    stopForm.placeName = ''
    catalogWards.value = []
    placeOptions.value = []
    catalogError.value = ''
    loadingCatalogWards.value = false
    loadingCatalogPlaces.value = false
    restoreOriginalPlace()

    if (!provinceCode) return

    loadingCatalogWards.value = true

    try {
        const items = await locationCatalogApi.listWards(provinceCode)
        if (requestId === wardsRequestId && stopForm.provinceCode === provinceCode) {
            catalogWards.value = items
        }
    } catch (requestError) {
        if (requestId === wardsRequestId) {
            catalogError.value = getErrorMessage(requestError, 'Không tải được danh sách phường/xã')
        }
    } finally {
        if (requestId === wardsRequestId) loadingCatalogWards.value = false
    }
}

async function loadCatalogPlaces() {
    const provinceCode = stopForm.provinceCode
    const wardCode = stopForm.wardCode
    const requestId = ++placesRequestId
    stopForm.placeName = ''
    placeOptions.value = []
    catalogError.value = ''
    loadingCatalogPlaces.value = false
    restoreOriginalPlace()

    if (!provinceCode || !wardCode) return

    loadingCatalogPlaces.value = true

    const catalogRequest = locationCatalogApi.listPlaces(provinceCode, wardCode)
    const backendRequest = placesApi.list({
        provinceCode,
        wardCode,
        wardName: catalogWards.value.find((ward) => ward.code === wardCode)?.name,
        page: 1,
        pageSize: 100,
    })
    const [catalogResult, backendResult] = await Promise.allSettled([
        catalogRequest,
        backendRequest,
    ])

    if (
        requestId === placesRequestId
        && stopForm.provinceCode === provinceCode
        && stopForm.wardCode === wardCode
    ) {
        const catalogItems = catalogResult.status === 'fulfilled' ? catalogResult.value : []
        const backendItems = backendResult.status === 'fulfilled' ? backendResult.value.data : []
        placeOptions.value = mergePlaceOptions(catalogItems, backendItems)

        if (catalogResult.status === 'rejected' && backendResult.status === 'rejected') {
            catalogError.value = getErrorMessage(
                backendResult.reason,
                'Không tải được danh sách địa điểm',
            )
        }
    }

    if (requestId === placesRequestId) loadingCatalogPlaces.value = false
}

function normalizeSelectedPlaceName() {
    const selectedPlace = placeOptions.value.find(
        (place) => place.selectionValue === stopForm.placeName.trim(),
    )

    if (!stopForm.placeName.trim()) {
        restoreOriginalPlace()
    } else if (selectedPlace) {
        stopForm.placeId = selectedPlace.backendPlaceId || ''
    } else {
        stopForm.placeId = ''
    }
    catalogError.value = ''
}

function selectedPlaceInput() {
    const placeName = stopForm.placeName.trim()

    if (!placeName) {
        restoreOriginalPlace()
        return stopForm.placeId ? { placeId: stopForm.placeId } : null
    }

    if (stopForm.placeId) return { placeId: stopForm.placeId }

    const catalogProvince = catalogProvinces.value.find(
        (province) => province.code === stopForm.provinceCode,
    )
    const catalogWard = catalogWards.value.find(
        (ward) => ward.code === stopForm.wardCode,
    )
    const selectedOption = placeOptions.value.find(
        (place) => place.selectionValue === placeName,
    )

    if (!catalogProvince || !catalogWard || catalogWard.legacy) return null

    return {
        place: {
            catalogPlaceId: selectedOption?.catalogPlaceId || null,
            countryCode: 'VN',
            provinceCode: catalogProvince.code,
            provinceName: catalogProvince.name,
            wardCode: catalogWard.code,
            wardName: catalogWard.name,
            name: selectedOption?.name || placeName,
            address: selectedOption?.address || null,
            latitude: selectedOption?.latitude ?? null,
            longitude: selectedOption?.longitude ?? null,
        },
    }
}

async function startEditing(stop) {
    showStopForm.value = true
    editingStopId.value = stop.id
    originalPlaceId.value = String(stop.placeId)
    catalogError.value = ''
    resetValidation()

    if (!catalogProvinces.value.some(
        (province) => province.code === stop.place.provinceCode,
    )) {
        catalogProvinces.value.push({
            code: stop.place.provinceCode,
            name: stop.place.provinceName,
        })
    }

    Object.assign(stopForm, {
        provinceCode: stop.place.provinceCode,
        wardCode: '',
        placeName: '',
        placeId: String(stop.placeId),
        arrivedAt: toLocalDateTime(stop.arrivedAt),
        departedAt: toLocalDateTime(stop.departedAt),
        title: stop.title || '',
        note: stop.note || '',
    })

    const expectedStopId = String(stop.id)
    await loadCatalogWards()
    if (String(editingStopId.value) !== expectedStopId) return

    let selectedWard = catalogWards.value.find(
        (ward) => ward.code === stop.place.wardCode,
    )
    if (!selectedWard && stop.place.wardName) {
        selectedWard = catalogWards.value.find(
            (ward) => normalizePlaceName(ward.name) === normalizePlaceName(stop.place.wardName),
        )
    }
    if (!selectedWard) {
        selectedWard = {
            code: `legacy:${stop.placeId}`,
            provinceCode: stop.place.provinceCode,
            name: stop.place.wardName || 'Phường/xã chưa xác định',
            legacy: true,
        }
        catalogWards.value.push(selectedWard)
    }

    stopForm.wardCode = selectedWard.code
    if (!selectedWard.legacy) {
        await loadCatalogPlaces()
        if (String(editingStopId.value) !== expectedStopId) return
    } else {
        placeOptions.value = []
    }

    if (!placeOptions.value.some(
        (place) => String(place.backendPlaceId) === String(stop.placeId),
    )) {
        placeOptions.value = addPlaceSelectionValues([{
            key: `backend:${stop.placeId}`,
            name: stop.place.name,
            backendPlaceId: String(stop.placeId),
            catalogPlaceId: stop.place.catalogPlaceId || null,
            address: stop.place.address || null,
            latitude: stop.place.latitude ?? null,
            longitude: stop.place.longitude ?? null,
        }, ...placeOptions.value])
    }

    const currentPlace = placeOptions.value.find(
        (place) => String(place.backendPlaceId) === String(stop.placeId),
    )
    stopForm.placeName = currentPlace?.selectionValue || stop.place.name
    stopForm.placeId = String(stop.placeId)
}

async function saveStop() {
    normalizeSelectedPlaceName()
    const placeInput = selectedPlaceInput()
    if (!placeInput) {
        catalogError.value = 'Vui lòng chọn đầy đủ tỉnh/thành, phường/xã và địa điểm'
        return
    }

    const payload = validate({
        ...placeInput,
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
        loadCatalogProvinces(),
    ])
})

onBeforeUnmount(() => {
    wardsRequestId += 1
    placesRequestId += 1
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
                            Tỉnh / thành phố
                            <select v-model="stopForm.provinceCode" required :disabled="loadingCatalogProvinces" @change="loadCatalogWards">
                                <option value="">{{ loadingCatalogProvinces ? 'Đang tải tỉnh/thành...' : 'Chọn tỉnh/thành' }}</option>
                                <option v-for="province in catalogProvinces" :key="province.code" :value="province.code">{{ province.name }}</option>
                            </select>
                        </label>
                        <label>
                            Phường / xã
                            <select v-model="stopForm.wardCode" required :disabled="!stopForm.provinceCode || loadingCatalogWards" @change="loadCatalogPlaces">
                                <option value="">{{ loadingCatalogWards ? 'Đang tải phường/xã...' : 'Chọn phường/xã' }}</option>
                                <option v-for="ward in catalogWards" :key="ward.code" :value="ward.code">{{ ward.name }}</option>
                            </select>
                        </label>
                    </div>
                    <label>
                        Địa điểm
                        <input
                            v-model="stopForm.placeName"
                            list="catalog-place-options"
                            maxlength="512"
                            autocomplete="off"
                            required
                            :disabled="!stopForm.wardCode || loadingCatalogPlaces"
                            :placeholder="loadingCatalogPlaces ? 'Đang tải địa điểm...' : 'Chọn hoặc nhập địa điểm'"
                            @input="normalizeSelectedPlaceName"
                            @change="normalizeSelectedPlaceName"
                        />
                        <datalist id="catalog-place-options">
                            <option v-for="place in placeOptions" :key="place.key" :value="place.selectionValue"></option>
                        </datalist>
                        <small>Chọn một gợi ý hoặc nhập tên địa điểm mới.</small>
                        <span v-if="errorFor('place') || errorFor('placeId')" class="field-error">{{ errorFor('place') || errorFor('placeId') }}</span>
                    </label>
                    <p v-if="catalogError" class="form-error">{{ catalogError }}</p>
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
                        Tiêu đề trạm
                        <input v-model="stopForm.title" maxlength="255" placeholder="Ví dụ: Ngắm bình minh bên hồ" />
                        <span v-if="errorFor('title')" class="field-error">{{ errorFor('title') }}</span>
                    </label>
                    <label>
                        Ghi chú dọc đường
                        <textarea v-model="stopForm.note" rows="3" placeholder="Đường vào, món nên thử, điều cần nhớ..."></textarea>
                        <span v-if="errorFor('note')" class="field-error">{{ errorFor('note') }}</span>
                    </label>
                    <p v-if="stopError" class="form-error">{{ stopError.message }}</p>
                    <div class="actions">
                        <button class="button button-primary" :disabled="stopLoading || !stopForm.provinceCode || !stopForm.wardCode || !stopForm.placeName.trim()" type="submit">{{ stopLoading ? 'Đang ghim...' : editingStopId ? 'Lưu trạm dừng' : 'Ghim vào lịch trình' }}</button>
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
                                    <p class="stop-location">
                                        {{ stop.place.provinceName }}<template v-if="stop.place.wardName"> · {{ stop.place.wardName }}</template>
                                    </p>
                                    <h3>{{ stop.title || stop.place.name }}</h3>
                                    <p v-if="stop.title" class="actual-place">⌖ {{ stop.place.name }}</p>
                                    <p v-if="stop.place.address" class="actual-place">{{ stop.place.address }}</p>
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
