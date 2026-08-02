<script setup>
import { RouterLink } from 'vue-router'
import { ROUTE_NAME } from '@/constants/routes.js'
</script>

<template>
    <main class="lost-page">
        <div class="lost-compass" aria-hidden="true">✦</div>
        <p class="eyebrow">404 · LẠC ĐƯỜNG</p>
        <h1 class="page-title">Con đường này<br />không có trên bản đồ.</h1>
        <p class="page-intro">Có lẽ bạn đã rẽ nhầm ở một khúc cua. Quay lại trạm đầu rồi chọn một cung đường khác nhé.</p>
        <RouterLink class="button button-primary" :to="{ name: ROUTE_NAME.HOME }">Về trạm đầu</RouterLink>
    </main>
</template>
