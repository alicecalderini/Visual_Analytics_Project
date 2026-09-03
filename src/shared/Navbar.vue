<script setup>
import { RouterLink } from 'vue-router'

const links = [
  { to: '/', label: 'COOTEFOO Members' },
  { to: '/map', label: 'Map & Movements' },
  { to: '/balance', label: 'Weigh-in' },
]
</script>
<template>
  <nav class="flex items-center gap-1 px-4 py-2.5 bg-slate-900 text-slate-100">
    <span class="text-xl font-bold tracking-tight mr-6">Inspecting <span class="text-[#60a5fa]">Currents</span></span>
    <RouterLink
      v-for="link in links" :key="link.to" :to="link.to"
      class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-700 transition-colors"
      active-class="bg-slate-700 font-medium"
    >{{ link.label }}</RouterLink>
  </nav>
</template>