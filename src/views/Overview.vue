<script setup>
import { ref, onMounted } from 'vue'
import { loadAll } from '../utils/dataManager'

const counts = ref(null)
const loading = ref(true)

onMounted(async () => {
  const data = await loadAll([
    'persons', 'organizations', 'places', 'topics', 'meetings',
    'trips', 'tripStops', 'initiatives', 'initiativeStatusTimeline', 'initiativeParticipants',
  ])
  counts.value = Object.fromEntries(
    Object.entries(data).map(([name, rows]) => [name, rows.length])
  )
  loading.value = false
})
</script>

<template>
  <div class="p-8 max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-2">COOTEFOO — Overview</h1>
    <p class="text-slate-600 mb-6">
      Esplorazione visuale delle accuse di FILAH e TROUT contro la Commission on
      Overseeing the Economic Future of Oceanus (COOTEFOO), a confronto con il
      dataset completo raccolto dalla giornalista E.D. Moray.
    </p>

    <div v-if="loading" class="text-slate-400">Caricamento tabelle...</div>
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div
        v-for="(n, name) in counts"
        :key="name"
        class="rounded-lg border border-slate-200 p-3 text-center"
      >
        <div class="text-2xl font-semibold">{{ n }}</div>
        <div class="text-xs text-slate-500">{{ name }}</div>
      </div>
    </div>

    <p class="text-sm text-slate-400 mt-8">
      Le viste "Bias Explorer", "FILAH vs TROUT vs Journalist" e "Profilo persona"
      conterranno i widget veri e propri (heatmap sentiment, mappa degli spostamenti,
      confronto testimoni, ecc.).
    </p>
  </div>
</template>
