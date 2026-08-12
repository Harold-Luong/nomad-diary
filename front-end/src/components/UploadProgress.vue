<script setup>
import { computed } from 'vue'

const props = defineProps({
    progress: { type: Number, default: 0 },
    status: { type: String, default: 'idle' },
    fileName: { type: String, default: '' },
})

const safeProgress = computed(() =>
    Math.min(100, Math.max(0, Math.round(props.progress))),
)

const statusText = computed(() => ({
    preparing: 'Đang chuẩn bị tải ảnh',
    uploading: 'Đang tải ảnh lên',
    saving: 'Đã tải ảnh, đang lưu thông tin',
    success: 'Ảnh đã được lưu',
    error: 'Không thể hoàn tất tải ảnh',
}[props.status] || 'Sẵn sàng tải ảnh'))
</script>

<template>
    <div
        v-if="status !== 'idle'"
        class="upload-progress"
        :class="`is-${status}`"
        aria-live="polite"
    >
        <div class="upload-progress-heading">
            <span class="upload-progress-icon" aria-hidden="true">↥</span>
            <span class="upload-progress-copy">
                <strong>{{ statusText }}</strong>
                <small v-if="fileName" :title="fileName">{{ fileName }}</small>
            </span>
            <strong class="upload-progress-value">{{ safeProgress }}%</strong>
        </div>
        <div
            class="upload-progress-track"
            role="progressbar"
            :aria-valuenow="safeProgress"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="statusText"
        >
            <span :style="{ width: `${safeProgress}%` }"></span>
        </div>
        <small v-if="status === 'preparing'" class="upload-progress-hint">
            Đang xin quyền tải lên từ máy chủ…
        </small>
        <small v-else-if="status === 'saving'" class="upload-progress-hint">
            Vui lòng giữ trang mở trong khi liên kết ảnh với dữ liệu.
        </small>
    </div>
</template>
