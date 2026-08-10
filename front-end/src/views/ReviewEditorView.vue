<script setup>
import { onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useReviewsStore } from '@/stores/reviews.js'
import { REVISIT_STATUS, REVISIT_STATUS_OPTIONS } from '@/constants/domain.js'
import { useFormValidation } from '@/composables/index.js'
import { reviewSchema } from '@/schemas/index.js'

const props = defineProps({ tripStopId: { type: String, required: true } })
const router = useRouter()
const reviewsStore = useReviewsStore()
const { loading, error } = storeToRefs(reviewsStore)
const reviewExists = ref(false)
const { validate, errorFor } = useFormValidation(reviewSchema)
const form = reactive({ rating: '', revisitStatus: REVISIT_STATUS.NOT_REVIEWED, isFavorite: false, note: '', warningNote: '' })

onMounted(async () => {
    try {
        const review = await reviewsStore.fetchReview(props.tripStopId)
        reviewExists.value = true
        Object.assign(form, {
            rating: review.rating ?? '',
            revisitStatus: review.revisitStatus,
            isFavorite: review.isFavorite,
            note: review.note || '',
            warningNote: review.warningNote || '',
        })
    } catch (requestError) {
        if (requestError?.status === 404) reviewsStore.error = null
    }
})

async function submit() {
    const payload = validate({
        rating: form.rating === '' ? null : Number(form.rating),
        revisitStatus: Number(form.revisitStatus),
        isFavorite: form.isFavorite,
        note: form.note,
        warningNote: form.warningNote,
    })
    if (!payload) return
    await reviewsStore.saveReview(props.tripStopId, payload)
    router.back()
}

async function removeReview() {
    if (!window.confirm('Xóa đánh giá của trạm dừng này?')) return
    await reviewsStore.deleteReview(props.tripStopId)
    router.back()
}
</script>

<template>
    <main class="page-shell review-layout">
        <aside class="review-aside">
            <button class="back-link back-button" type="button" @click="router.back()">← Trở lại hành trình</button>
            <span class="review-stamp">STOP<br />#{{ tripStopId }}</span>
            <p class="eyebrow">GHI CHÚ SAU CHUYẾN ĐI</p>
            <h1 class="page-title">Nơi này có đáng quay lại?</h1>
            <p class="page-intro">Viết thật lòng để lần sau bạn vẫn nhớ cảm giác của ngày hôm nay.</p>
        </aside>

        <form class="form-card travel-form" @submit.prevent="submit">
            <div class="rating-field">
                <span>Điểm đánh giá</span>
                <div class="rating-options">
                    <label v-for="rating in 5" :key="rating" :class="{ active: Number(form.rating) >= rating }">
                        <input v-model="form.rating" :value="rating" type="radio" />★
                    </label>
                    <button v-if="form.rating !== ''" class="text-button" type="button" @click="form.rating = ''">Bỏ điểm</button>
                </div>
                <span v-if="errorFor('rating')" class="field-error">{{ errorFor('rating') }}</span>
            </div>
            <label>Khả năng quay lại <select v-model.number="form.revisitStatus"><option v-for="status in REVISIT_STATUS_OPTIONS" :key="status.value" :value="status.value">{{ status.label }}</option></select><span v-if="errorFor('revisitStatus')" class="field-error">{{ errorFor('revisitStatus') }}</span></label>
            <label class="checkbox-label paper-check"><input v-model="form.isFavorite" type="checkbox" /><span><strong>Đưa vào danh sách yêu thích</strong><small>Một địa điểm đáng giữ lại trong tim.</small></span></label>
            <label>Điều đáng nhớ <textarea v-model="form.note" rows="5" placeholder="Cảnh vật, con người, món ăn, cảm giác..."></textarea><span v-if="errorFor('note')" class="field-error">{{ errorFor('note') }}</span></label>
            <label>Lời nhắc cho lần sau <textarea v-model="form.warningNote" rows="3" placeholder="Đường khó đi, giờ đông, điều nên tránh..."></textarea><span v-if="errorFor('warningNote')" class="field-error">{{ errorFor('warningNote') }}</span></label>
            <p v-if="error" class="form-error">{{ error.message }}</p>
            <div class="actions">
                <button class="button button-primary" :disabled="loading" type="submit">{{ loading ? 'Đang ép trang sổ...' : 'Lưu vào nhật ký' }}</button>
                <button v-if="reviewExists" class="button button-danger-ghost" :disabled="loading" type="button" @click="removeReview">Xóa đánh giá</button>
            </div>
        </form>
    </main>
</template>
