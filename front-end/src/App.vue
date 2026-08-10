<script setup>
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.js'
import { ROUTE_NAME } from '@/constants/routes.js'

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated, user } = storeToRefs(authStore)

async function logout() {
  try {
    await authStore.logout()
  } catch {
    // The store keeps the error and always clears the local session.
  } finally {
    await router.push({ name: ROUTE_NAME.HOME })
  }
}
</script>

<template>
  <div class="site-frame">
    <header class="site-header">
      <RouterLink class="brand" :to="{ name: ROUTE_NAME.HOME }" aria-label="Nomad Diary - Trang chủ">
        <span class="brand-mark" aria-hidden="true">✦</span>
        <span>
          <strong>Nomad Diary</strong>
          <small>Nhật ký dọc đường</small>
        </span>
      </RouterLink>

      <nav class="site-nav" aria-label="Điều hướng chính">
        <RouterLink :to="{ name: ROUTE_NAME.HOME }">Trạm đầu</RouterLink>
        <RouterLink v-if="isAuthenticated" :to="{ name: ROUTE_NAME.TRIPS }">Cung đường</RouterLink>
        <RouterLink v-if="isAuthenticated" :to="{ name: ROUTE_NAME.PROVINCES }">Dấu chân</RouterLink>
        <RouterLink v-if="isAuthenticated" class="profile-link" :to="{ name: ROUTE_NAME.PROFILE }">
          {{ user?.displayName || user?.username || 'Hồ sơ' }}
        </RouterLink>
        <RouterLink v-if="!isAuthenticated" :to="{ name: ROUTE_NAME.LOGIN }">Đăng nhập</RouterLink>
        <RouterLink v-if="!isAuthenticated" class="nav-accent" :to="{ name: ROUTE_NAME.REGISTER }">
          Lên đường
        </RouterLink>
        <button v-else class="nav-button" type="button" @click="logout">Đăng xuất</button>
      </nav>
    </header>

    <RouterView />

    <footer class="site-footer">
      <div>
        <strong>Nomad Diary</strong>
        <span>Ghi lại từng cung đường, nhớ từng nơi đã qua.</span>
      </div>
      <p>Made for dusty boots &amp; open roads · Việt Nam</p>
    </footer>
  </div>
</template>
