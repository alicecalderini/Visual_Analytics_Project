<script setup>
import Navbar from './components/Navbar.vue'
</script>

<!-- keep-alive evita di ricostruire i widget D3 ogni volta che si cambia vista -->
<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <Navbar class="shrink-0" />
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" class="flex-1 overflow-auto" />
      </keep-alive>
    </router-view>
  </div>
</template>
