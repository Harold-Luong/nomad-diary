<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'

import { healthApi } from '@/api/health.js'
import { useAuthStore } from '@/stores/auth.js'
import { ROUTE_NAME } from '@/constants/routes.js'
import { ApiError } from '@/services/api.js'

const authStore = useAuthStore()
const { isAuthenticated, user } = storeToRefs(authStore)
const apiState = ref('checking')
const apiMessage = ref('Đang bắt tín hiệu từ trạm máy chủ...')

const statusLabel = computed(() => {
    if (apiState.value === 'connected') return 'Trạm đang hoạt động'
    if (apiState.value === 'failed') return 'Mất tín hiệu'
    return 'Đang dò đường'
})

async function checkBackend() {
    apiState.value = 'checking'
    apiMessage.value = 'Đang bắt tín hiệu từ trạm máy chủ...'

    try {
        const [healthResponse, readinessResponse] = await Promise.all([
            healthApi.check(),
            healthApi.readiness(),
        ])
        apiState.value = 'connected'
        apiMessage.value = `${healthResponse.data.service} · PostgreSQL ${readinessResponse.data.database}`
    } catch (error) {
        apiState.value = 'failed'
        apiMessage.value = error instanceof ApiError ? error.message : 'Không thể kết nối backend.'
    }
}

onMounted(checkBackend)
</script>

<template>
    <main class="home-page">
        <section class="home-hero" aria-labelledby="page-title">
            <div class="hero-copy">
                <p class="eyebrow">NHẬT KÝ CỦA NHỮNG ĐÔI CHÂN KHÔNG MỎI</p>
                <h1 id="page-title">Đi xa.<br /><em>Ghi lại.</em><br />Nhớ mãi.</h1>
                <p class="lead">
                    Một cuốn sổ tay số dành cho những chuyến xe bụi đường, những trạm dừng bất chợt
                    và những miền đất khiến bạn muốn quay lại.
                </p>
                <div class="actions">
                    <RouterLink
                        class="button button-primary"
                        :to="{ name: isAuthenticated ? ROUTE_NAME.TRIPS : ROUTE_NAME.REGISTER }"
                    >
                        {{ isAuthenticated ? 'Mở sổ hành trình' : 'Bắt đầu lên đường' }}
                    </RouterLink>
                    <RouterLink
                        class="button button-secondary"
                        :to="{ name: isAuthenticated ? ROUTE_NAME.PROVINCES : ROUTE_NAME.LOGIN }"
                    >
                        {{ isAuthenticated ? 'Xem dấu chân' : 'Đã có tài khoản' }}
                    </RouterLink>
                </div>
                <p v-if="isAuthenticated" class="welcome-note">
                    Chào {{ user?.displayName || user?.username }}, hôm nay mình đi đâu?
                </p>
            </div>

            <div class="hero-poster" aria-hidden="true">
                <div class="poster-sun"></div>
                <div class="mountain mountain-back"></div>
                <div class="mountain mountain-front"></div>
                <div class="road"></div>
                <span class="poster-label">VIET NAM</span>
                <strong>THE OPEN<br />ROAD</strong>
                <small>11°N — 108°E</small>
            </div>
        </section>

        <section class="status-strip" aria-live="polite">
            <div class="status-heading">
                <span class="status-dot" :class="`status-${apiState}`" aria-hidden="true"></span>
                <div>
                    <p class="status-title">Tình trạng trạm</p>
                    <p class="status-value">{{ statusLabel }}</p>
                </div>
            </div>
            <p class="status-message">{{ apiMessage }}</p>
            <button class="text-button" type="button" @click="checkBackend">Kiểm tra lại ↻</button>
        </section>

        <section class="field-notes" aria-labelledby="field-notes-title">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">TRONG CHIẾC BA LÔ</p>
                    <h2 id="field-notes-title">Mọi thứ cho một hành trình đáng nhớ</h2>
                </div>
                <p>Mỗi tính năng là một trang giấy để câu chuyện dọc đường không bị bỏ quên.</p>
            </div>
            <div class="feature-grid">
                <article>
                    <span class="feature-number">01</span>
                    <div class="feature-icon">⌁</div>
                    <h3>Cung đường riêng</h3>
                    <p>Lên lịch, ghi ngày đi, trạng thái và sắp xếp từng trạm dừng theo đúng thứ tự.</p>
                </article>
                <article>
                    <span class="feature-number">02</span>
                    <div class="feature-icon">⌖</div>
                    <h3>Bản đồ dấu chân</h3>
                    <p>Đếm tỉnh thành, địa điểm và số lần quay lại trên khắp những miền đã qua.</p>
                </article>
                <article>
                    <span class="feature-number">03</span>
                    <div class="feature-icon">★</div>
                    <h3>Ghi chú thật lòng</h3>
                    <p>Chấm điểm, đánh dấu yêu thích và lưu lời nhắc cho lần trở lại sau này.</p>
                </article>
            </div>
        </section>

        <section class="quote-banner">
            <span>“</span>
            <blockquote>Không phải ai lang thang cũng là người lạc đường.</blockquote>
            <p>— J.R.R. Tolkien</p>
        </section>
    </main>
</template>
