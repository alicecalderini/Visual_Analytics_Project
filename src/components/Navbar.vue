<script setup>
import { RouterLink } from 'vue-router'

const links = [
  { to: '/', label: 'Overview' },
  { to: '/bias-explorer', label: 'Bias Explorer' },
  { to: '/comparison', label: 'FILAH vs TROUT vs Journalist' },
  { to: '/person-profile', label: 'Profilo persona' },
]
</script>

<template>
  <nav class="flex items-center gap-1 px-4 py-2 bg-slate-900 text-slate-100">
    <span class="font-semibold mr-4 tracking-tight">COOTEFOO Visual Analytics</span>
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="px-3 py-1.5 rounded-md text-sm hover:bg-slate-700 transition-colors"
      active-class="bg-slate-700 font-medium"
    >
      {{ link.label }}
    </RouterLink>
  </nav>
</template>
