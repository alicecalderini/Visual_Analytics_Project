<script setup>
import { ref, computed, onMounted } from 'vue'
import { filterStore } from '../store/filterStore'
import { getInitiativeParticipants, getInitiatives } from '../utils/dataManager'
import { buildPersonTopicSentiment, isKnownInDataset } from '../utils/personTopicSentiment'

const rows = ref([])
const loading = ref(true)

onMounted(async () => {
  const [participants, initiatives] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(),
  ])
  rows.value = buildPersonTopicSentiment(participants, initiatives)
  loading.value = false
})

const summary = computed(() => {
  const dataset = filterStore.activeDataset
  const known = rows.value.filter((r) => r.sentiment !== null && isKnownInDataset(r, dataset))
  const totalKnown = rows.value.filter((r) => r.sentiment !== null)

  const persons = new Set(known.filter((r) => r.entity_type === 'entity.person').map((r) => r.entity_id))
  const orgs = new Set(known.filter((r) => r.entity_type === 'entity.organization').map((r) => r.entity_id))
  const topics = new Set(known.map((r) => r.topic_id))
  const totalTopics = new Set(totalKnown.map((r) => r.topic_id))

  return {
    persons: persons.size,
    orgs: orgs.size,
    topics: topics.size,
    totalTopics: totalTopics.size,
    cells: known.length,
    totalCells: totalKnown.length,
  }
})
</script>

<template>
  <div class="border border-slate-200 rounded-lg p-4 w-72 shrink-0">
    <h2 class="font-semibold mb-1">Cosa mostra la heatmap</h2>
    <p class="text-xs text-slate-400 mb-4">
      Dataset: <b>{{ filterStore.activeDataset }}</b>
    </p>

    <div v-if="loading" class="text-slate-400 text-sm">Caricamento...</div>
    <dl v-else class="flex flex-col gap-3 text-sm">
      <div class="flex justify-between items-baseline">
        <dt class="text-slate-500">Persone</dt>
        <dd class="font-semibold">{{ summary.persons }}</dd>
      </div>
      <div class="flex justify-between items-baseline">
        <dt class="text-slate-500">Organizzazioni</dt>
        <dd class="font-semibold">{{ summary.orgs }}</dd>
      </div>
      <div class="flex justify-between items-baseline">
        <dt class="text-slate-500">Topic coperti</dt>
        <dd class="font-semibold">
          {{ summary.topics }}
          <span class="text-slate-400 font-normal">/ {{ summary.totalTopics }}</span>
        </dd>
      </div>
      <div class="flex justify-between items-baseline pt-2 border-t border-slate-100">
        <dt class="text-slate-500">Opinioni note</dt>
        <dd class="font-semibold">
          {{ summary.cells }}
          <span class="text-slate-400 font-normal">/ {{ summary.totalCells }}</span>
        </dd>
      </div>
    </dl>

    <p v-if="!loading && filterStore.activeDataset !== 'journalist'" class="text-xs text-slate-400 mt-4">
      Confrontato con il quadro completo (<b>journalist</b>), qui mancano
      {{ summary.totalCells - summary.cells }} opinioni su {{ summary.totalCells }}.
    </p>
  </div>
</template>