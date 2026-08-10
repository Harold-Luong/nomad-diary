<script setup>
import { onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { useProvincesStore } from '@/stores/provinces.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { formatDate } from '@/utils/date.js'

const props = defineProps({ id: { type: String, required: true } })
const provincesStore = useProvincesStore()
const { current: province, places, placesMeta, loading, error } = storeToRefs(provincesStore)
const filters = reactive({ search: '', visited: '', page: 1, pageSize: 12 })

async function loadPlaces(resetPage = false) {
    if (resetPage) filters.page = 1
    await provincesStore.fetchPlaces(props.id, filters)
}

async function goToPage(page) {
    if (page < 1 || page > placesMeta.value.totalPages) return
    filters.page = page
    await loadPlaces()
}

onMounted(() => Promise.all([provincesStore.fetchProvince(props.id), loadPlaces()]))
</script>

<template>
    <main class="page-shell">
        <RouterLink class="back-link" :to="{ name: ROUTE_NAME.PROVINCES }">← Trở lại bản đồ</RouterLink>

        <p v-if="loading && !province" class="empty-state">Đang dò tọa độ...</p>
        <p v-else-if="error && !province" class="form-error">{{ error.message }}</p>

        <template v-else-if="province">
            <section class="province-hero">
                <div>
                    <p class="eyebrow">TỈNH {{ province.code }} · {{ province.countryCode }}</p>
                    <h1 class="page-title">{{ province.name }}</h1>
                    <p class="page-intro">
                        {{ province.visited
                            ? `Dấu chân đầu tiên từ ${formatDate(province.firstVisitedAt)}.`
                            : 'Một vùng đất mới đang chờ được ghi vào sổ tay.' }}
                    </p>
                </div>
                <div class="coordinate-card">
                    <span>TỌA ĐỘ TRUNG TÂM</span>
                    <strong>{{ province.centerLatitude ?? '—' }}</strong>
                    <strong>{{ province.centerLongitude ?? '—' }}</strong>
                </div>
            </section>

            <section class="travel-stats province-summary">
                <div><span>Chuyến đi</span><strong>{{ province.tripCount }}</strong></div>
                <div><span>Địa điểm</span><strong>{{ province.placeCount }}</strong></div>
                <div><span>Lượt ghé</span><strong>{{ province.visitCount }}</strong></div>
                <div><span>Lần cuối</span><strong class="stat-date">{{ formatDate(province.lastVisitedAt) }}</strong></div>
            </section>

            <section class="section-block">
                <div class="section-heading">
                    <div>
                        <p class="eyebrow">TRẠM DỪNG</p>
                        <h2>Địa điểm trong {{ province.name }}</h2>
                    </div>
                    <span class="count-note">{{ placesMeta.total }} địa điểm</span>
                </div>

                <form class="filter-bar" @submit.prevent="loadPlaces(true)">
                    <label class="filter-grow">
                        Tìm địa điểm
                        <input v-model.trim="filters.search" placeholder="Tên, quận huyện hoặc địa chỉ..." />
                    </label>
                    <label>
                        Trạng thái
                        <select v-model="filters.visited">
                            <option value="">Tất cả</option>
                            <option :value="true">Đã ghé</option>
                            <option :value="false">Chưa ghé</option>
                        </select>
                    </label>
                    <button class="button button-primary" :disabled="loading" type="submit">Lọc điểm</button>
                </form>

                <p v-if="error" class="form-error">{{ error.message }}</p>
                <p v-else-if="places.length === 0" class="empty-state">Chưa có địa điểm phù hợp.</p>

                <div v-else class="place-list">
                    <article v-for="place in places" :key="place.id" class="place-card">
                        <div class="place-pin" aria-hidden="true">⌖</div>
                        <div class="place-content">
                            <div class="place-title-row">
                                <div>
                                    <span class="visited-badge">{{ place.visited ? 'Đã ghé' : 'Đang chờ' }}</span>
                                    <h3>{{ place.name }}</h3>
                                </div>
                                <strong>#{{ place.id }}</strong>
                            </div>
                            <p>{{ place.description || place.address || 'Chưa có ghi chú địa điểm.' }}</p>
                            <p class="place-address">{{ [place.ward, place.district, province.name].filter(Boolean).join(', ') }}</p>
                            <div class="place-footer">
                                <span>{{ place.visitCount }} lượt ghé · {{ place.tripCount }} chuyến</span>
                                <a v-if="place.mapUrl" :href="place.mapUrl" target="_blank" rel="noreferrer">Mở bản đồ ↗</a>
                                <a v-else-if="place.websiteUrl" :href="place.websiteUrl" target="_blank" rel="noreferrer">Xem địa điểm ↗</a>
                            </div>
                        </div>
                    </article>
                </div>

                <nav v-if="placesMeta.totalPages > 1" class="pagination" aria-label="Phân trang địa điểm">
                    <button class="button button-secondary" :disabled="filters.page <= 1 || loading" @click="goToPage(filters.page - 1)">← Trước</button>
                    <span>Trang {{ placesMeta.page }} / {{ placesMeta.totalPages }}</span>
                    <button class="button button-secondary" :disabled="filters.page >= placesMeta.totalPages || loading" @click="goToPage(filters.page + 1)">Sau →</button>
                </nav>
            </section>
        </template>
    </main>
</template>
