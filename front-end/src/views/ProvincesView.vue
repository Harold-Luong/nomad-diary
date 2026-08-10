<script setup>
import { computed, onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useProvincesStore } from '@/stores/provinces.js'
import { PAGINATION } from '@/constants/app.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { formatDate } from '@/utils/date.js'

const provincesStore = useProvincesStore()
const { items, visited, meta, loading, error } = storeToRefs(provincesStore)
const filters = reactive({
    countryCode: 'VN',
    search: '',
    visited: '',
    page: PAGINATION.DEFAULT_PAGE,
    pageSize: 12,
})

const totals = computed(() =>
    visited.value.reduce(
        (summary, province) => ({
            trips: summary.trips + province.tripCount,
            places: summary.places + province.placeCount,
            visits: summary.visits + province.visitCount,
        }),
        { trips: 0, places: 0, visits: 0 },
    ),
)

async function loadProvinces(resetPage = false) {
    if (resetPage) filters.page = 1
    await provincesStore.fetchProvinces(filters)
}

async function goToPage(page) {
    if (page < 1 || page > meta.value.totalPages || page === filters.page) return
    filters.page = page
    await loadProvinces()
}

onMounted(() =>
    Promise.all([
        loadProvinces(),
        provincesStore.fetchVisited({ countryCode: filters.countryCode }),
    ]),
)
</script>

<template>
    <main class="page-shell">
        <section class="page-heading-row trail-heading">
            <div>
                <p class="eyebrow">DẤU CHÂN VIỆT NAM</p>
                <h1 class="page-title">Bản đồ hành trình</h1>
                <p class="page-intro">
                    Ghim lại những miền đất đã qua và tìm trạm dừng tiếp theo trên cung đường.
                </p>
            </div>
            <div class="passport-stamp" aria-label="Số tỉnh thành đã ghé">
                <strong>{{ visited.length }}</strong>
                <span>tỉnh đã ghé</span>
            </div>
        </section>

        <section class="travel-stats" aria-label="Thống kê hành trình">
            <div><span>Chuyến đi</span><strong>{{ totals.trips }}</strong></div>
            <div><span>Điểm đã ghé</span><strong>{{ totals.places }}</strong></div>
            <div><span>Lượt dừng chân</span><strong>{{ totals.visits }}</strong></div>
            <div><span>Miền đất</span><strong>{{ visited.length }}</strong></div>
        </section>

        <form class="filter-bar map-filter" @submit.prevent="loadProvinces(true)">
            <label class="filter-grow">
                Tìm tỉnh hoặc mã tỉnh
                <input v-model.trim="filters.search" placeholder="Ví dụ: Lâm Đồng, 68..." />
            </label>
            <label>
                Dấu chân
                <select v-model="filters.visited">
                    <option value="">Tất cả tỉnh thành</option>
                    <option :value="true">Đã ghé</option>
                    <option :value="false">Chưa ghé</option>
                </select>
            </label>
            <button class="button button-primary" :disabled="loading" type="submit">
                Tìm trên bản đồ
            </button>
        </form>

        <p v-if="error" class="form-error">{{ error.message }}</p>
        <p v-else-if="loading && items.length === 0" class="empty-state">Đang mở bản đồ giấy...</p>
        <p v-else-if="items.length === 0" class="empty-state">Chưa tìm thấy miền đất phù hợp.</p>

        <section v-else class="province-grid" aria-label="Danh sách tỉnh thành">
            <RouterLink
                v-for="province in items"
                :key="province.id"
                class="province-card"
                :class="{ 'province-card-visited': province.visited }"
                :to="{ name: ROUTE_NAME.PROVINCE_DETAIL, params: { id: province.id } }"
            >
                <div class="province-card-top">
                    <span class="map-code">{{ province.code }}</span>
                    <span class="visited-badge">{{ province.visited ? 'Đã đặt chân' : 'Chưa khám phá' }}</span>
                </div>
                <h2>{{ province.name }}</h2>
                <p class="province-country">{{ province.countryCode }} · {{ province.slug }}</p>
                <dl class="mini-stats">
                    <div><dt>Chuyến</dt><dd>{{ province.tripCount }}</dd></div>
                    <div><dt>Điểm</dt><dd>{{ province.placeCount }}</dd></div>
                    <div><dt>Lượt ghé</dt><dd>{{ province.visitCount }}</dd></div>
                </dl>
                <p class="last-visit">
                    {{ province.lastVisitedAt ? `Lần cuối ${formatDate(province.lastVisitedAt)}` : 'Một cung đường đang chờ' }}
                </p>
            </RouterLink>
        </section>

        <nav v-if="meta.totalPages > 1" class="pagination" aria-label="Phân trang tỉnh thành">
            <button class="button button-secondary" :disabled="filters.page <= 1 || loading" @click="goToPage(filters.page - 1)">
                ← Trang trước
            </button>
            <span>Trang {{ meta.page }} / {{ meta.totalPages }}</span>
            <button class="button button-secondary" :disabled="filters.page >= meta.totalPages || loading" @click="goToPage(filters.page + 1)">
                Trang sau →
            </button>
        </nav>
    </main>
</template>
