<script setup>
import { ref, onMounted } from 'vue'
import { filterStore } from '../store/filterStore'
import { getInitiativeParticipants } from '../utils/dataManager'

const nParticipations = ref(null)

onMounted(async () => {
  const rows = await getInitiativeParticipants()
  nParticipations.value = rows.length
})
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-2">Bias Explorer</h1>
    <p class="text-slate-600 mb-4">
      Task 1 &amp; 2 — bias nei dataset di parte (FILAH/TROUT) e nel COOTEFOO nel suo
      complesso. Qui vivranno: heatmap sentiment per persona/industria/topic, il grafico
      "bias score" (tourism − fishing) per persona, e la somma sentiment fishing vs
      tourism per dataset.
    </p>

    <div class="flex items-center gap-2 mb-6">
      <span class="text-sm text-slate-500">Dataset attivo:</span>
      <button
        v-for="ds in ['journalist', 'FILAH', 'TROUT']"
        :key="ds"
        class="px-3 py-1 rounded-md text-sm border"
        :class="filterStore.activeDataset === ds
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
        @click="filterStore.activeDataset = ds"
      >
        {{ ds }}
      </button>
    </div>

    <div class="text-sm text-slate-400">
      (placeholder) archi participant deduplicati caricati: {{ nParticipations }}
    </div>
  </div>
</template>
