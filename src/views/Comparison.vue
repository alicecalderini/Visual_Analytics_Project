<script setup>
import { onMounted, ref } from 'vue'
import { getInitiatives } from '../utils/dataManager'

const coverage = ref(null)

onMounted(async () => {
  const initiatives = await getInitiatives()
  coverage.value = {
    total: initiatives.length,
    inFilah: initiatives.filter((i) => i.in_filah).length,
    inTrout: initiatives.filter((i) => i.in_trout).length,
  }
})
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-2">FILAH vs TROUT vs Journalist</h1>
    <p class="text-slate-600 mb-4">
      Task 3 — le accuse di TROUT si rafforzano, si indeboliscono o restano invariate
      alla luce del dataset completo? Qui vivranno i confronti fianco a fianco
      (copertura membri/meeting/topic, heatmap sentiment affiancate per dataset).
    </p>

    <div v-if="coverage" class="flex gap-6 text-sm">
      <div>Iniziative totali (journalist): <b>{{ coverage.total }}</b></div>
      <div>Note a FILAH: <b>{{ coverage.inFilah }}</b></div>
      <div>Note a TROUT: <b>{{ coverage.inTrout }}</b></div>
    </div>
  </div>
</template>
