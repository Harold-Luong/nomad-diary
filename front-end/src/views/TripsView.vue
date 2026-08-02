<script setup>
import { onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useTripsStore } from '@/stores/trips.js'
import { PAGINATION } from '@/constants/app.js'
import { TRIP_STATUS_LABEL, TRIP_STATUS_OPTIONS } from '@/constants/domain.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { formatDate } from '@/utils/date.js'

const tripsStore = useTripsStore()
const { items, meta, loading, error } = storeToRefs(tripsStore)
const filters = reactive({
    page: PAGINATION.DEFAULT_PAGE,
    pageSize: 9,
    status: '',
    year: '',
    search: '',
    sort: 'createdAtDesc',
})

async function loadTrips(resetPage = false) {
    if (resetPage) filters.page = 1
    await tripsStore.fetchTrips(filters)
}

async function goToPage(page) {
    if (page < 1 || page > meta.value.totalPages || page === filters.page) return
    filters.page = page
    await loadTrips()
}

onMounted(loadTrips)
</script>

<template>
    <main class="page-shell">
        <section class="page-heading-row trail-heading">
            <div>
                <p class="eyebrow">SỔ TAY DỌC ĐƯỜNG</p>
                <h1 class="page-title">Những cung đường</h1>
                <p class="page-intro">{{ meta.total }} hành trình, mỗi chuyến là một câu chuyện riêng.</p>
            </div>
            <RouterLink class="button button-primary" :to="{ name: ROUTE_NAME.TRIP_CREATE }">
                + Ghi chuyến mới
            </RouterLink>
        </section>

        <form class="filter-card" @submit.prevent="loadTrips(true)">
            <label class="filter-search">
                Tìm trong sổ tay
                <input v-model.trim="filters.search" placeholder="Tên chuyến đi hoặc một kỷ niệm..." />
            </label>
            <label>
                Trạng thái
                <select v-model="filters.status">
                    <option value="">Tất cả</option>
                    <option v-for="status in TRIP_STATUS_OPTIONS" :key="status.value" :value="status.value">
                        {{ status.label }}
                    </option>
                </select>
            </label>
            <label>
                Năm
                <input v-model="filters.year" inputmode="numeric" min="1900" max="2200" placeholder="2026" type="number" />
            </label>
            <label>
                Sắp xếp
                <select v-model="filters.sort">
                    <option value="createdAtDesc">Mới ghi gần đây</option>
                    <option value="createdAtAsc">Ghi lâu nhất</option>
                    <option value="startDateDesc">Ngày đi mới nhất</option>
                    <option value="startDateAsc">Ngày đi sớm nhất</option>
                    <option value="titleAsc">Tên A → Z</option>
                    <option value="titleDesc">Tên Z → A</option>
                </select>
            </label>
            <button class="button button-secondary" :disabled="loading" type="submit">Lọc hành trình</button>
        </form>

        <p v-if="error" class="form-error">{{ error.message }}</p>
        <p v-else-if="loading && items.length === 0" class="empty-state">Đang giở từng trang sổ...</p>
        <section v-else-if="items.length === 0" class="empty-state empty-state-large">
            <span>⌁</span>
            <h2>Trang giấy còn trống</h2>
            <p>Chưa có chuyến đi phù hợp. Một cung đường mới có thể bắt đầu ngay hôm nay.</p>
            <RouterLink class="button button-primary" :to="{ name: ROUTE_NAME.TRIP_CREATE }">Ghi chuyến đầu tiên</RouterLink>
        </section>

        <section v-else class="trip-grid" aria-label="Danh sách chuyến đi">
            <RouterLink
                v-for="trip in items"
                :key="trip.id"
                class="trip-card"
                :to="{ name: ROUTE_NAME.TRIP_DETAIL, params: { id: trip.id } }"
            >
                <div class="trip-cover" :style="trip.thumbnailUrl ? { backgroundImage: `url(${trip.thumbnailUrl})` } : null">
                    <span class="trip-status" :class="`trip-status-${trip.status}`">{{ TRIP_STATUS_LABEL[trip.status] }}</span>
                    <span v-if="!trip.thumbnailUrl" class="cover-mark">△</span>
                    <span class="trip-number">NO. {{ String(trip.id).padStart(3, '0') }}</span>
                </div>
                <div class="trip-card-body">
                    <p class="trip-date">{{ formatDate(trip.startDate, { fallback: 'Ngày đi chưa định' }) }}</p>
                    <h2>{{ trip.title }}</h2>
                    <p>{{ trip.description || 'Một hành trình chưa kịp viết lời mở đầu.' }}</p>
                    <div class="trip-card-footer">
                        <span>{{ trip.stopCount }} trạm dừng</span>
                        <strong>Mở sổ →</strong>
                    </div>
                </div>
            </RouterLink>
        </section>

        <nav v-if="meta.totalPages > 1" class="pagination" aria-label="Phân trang chuyến đi">
            <button class="button button-secondary" :disabled="filters.page <= 1 || loading" @click="goToPage(filters.page - 1)">← Trang trước</button>
            <span>Trang {{ meta.page }} / {{ meta.totalPages }}</span>
            <button class="button button-secondary" :disabled="filters.page >= meta.totalPages || loading" @click="goToPage(filters.page + 1)">Trang sau →</button>
        </nav>
    </main>
</template>
