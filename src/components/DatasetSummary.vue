<script setup>
/**
 * Riepilogo di cosa il dataset attivo "sa" rispetto al quadro completo (journalist):
 * conteggi + elenco esplicito di CHI e QUALI TOPIC mancano - cosi' la giornalista
 * non deve andarseli a cercare a occhio nella heatmap.
 */
import { ref, computed, onMounted } from 'vue'
import { filterStore } from '../store/filterStore'
import { getInitiativeParticipants, getInitiatives, getTopics, getPersons, getOrganizations } from '../utils/dataManager'
import { buildPersonTopicSentiment, isKnownInDataset, readableLabel } from '../utils/personTopicSentiment'

const rows = ref([])
const topicLabel = ref(new Map())
const allPersonIds = ref([])
const allOrgIds = ref([])
const loading = ref(true)

onMounted(async () => {
  const [participants, initiatives, topics, persons, orgs] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(), getTopics(), getPersons(), getOrganizations(),
  ])
  rows.value = buildPersonTopicSentiment(participants, initiatives)
  topicLabel.value = new Map(topics.map((t) => [t.id, t.short_topic]))
  allPersonIds.value = persons.map((p) => p.id)
  allOrgIds.value = orgs.map((o) => o.id)
  loading.value = false
})

const summary = computed(() => {
  const dataset = filterStore.activeDataset
  const known = rows.value.filter((r) => r.sentiment !== null && isKnownInDataset(r, dataset))
  const totalKnown = rows.value.filter((r) => r.sentiment !== null)

  const knownPersons = new Set(known.filter((r) => r.entity_type === 'entity.person').map((r) => r.entity_id))
  const knownOrgs = new Set(known.filter((r) => r.entity_type === 'entity.organization').map((r) => r.entity_id))
  const knownTopics = new Set(known.map((r) => r.topic_id))
  const totalTopics = new Set(totalKnown.map((r) => r.topic_id))

  const allOpinionatedPersons = new Set(
    totalKnown.filter((r) => r.entity_type === 'entity.person').map((r) => r.entity_id),
  )
  const missingPersons = [...allOpinionatedPersons].filter((id) => !knownPersons.has(id)).sort()
  const missingTopics = [...totalTopics].filter((id) => !knownTopics.has(id)).sort()

  return {
    persons: knownPersons.size,
    orgs: knownOrgs.size,
    topics: knownTopics.size,
    totalTopics: totalTopics.size,
    cells: known.length,
    totalCells: totalKnown.length,
    missingPersons,
    missingTopics,
  }
})
</script>

<template>
  <!-- era: <div class="border border-slate-200 rounded-lg p-4 w-80 shrink-0"> -->
  <div class="border border-slate-200 rounded-lg p-4 w-full">
  
  <h2 class="font-semibold text-lg mb-1">Cosa mostra la heatmap</h2>
  <p class="text-sm text-slate-400 mb-4">
      Dataset: <b>{{ filterStore.activeDataset }}</b>
    </p>

    <div v-if="loading" class="text-slate-400 text-sm">Caricamento...</div>
    <template v-else>
      <dl class="flex flex-col gap-3 text-base">
        <div class="flex justify-between items-baseline">
          <dt class="text-slate-500">Persone con opinioni</dt>
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

    <div v-if="filterStore.activeDataset !== 'journalist'" class="mt-4 pt-3 border-t border-slate-100 text-sm">
      <template v-if="summary.missingPersons.length">
          <p class="text-slate-500 mb-1">
            <b>Persone mute</b> in questo dataset (hanno opinioni solo nel quadro completo):
          </p>
          <p class="text-rose-600 font-medium mb-3">{{ summary.missingPersons.join(', ') }}</p>
        </template>
        <template v-if="summary.missingTopics.length">
          <p class="text-slate-500 mb-1">
            <b>Topic assenti</b> ({{ summary.missingTopics.length }}):
          </p>
          <p class="text-rose-600 font-medium">
            {{ summary.missingTopics.map((t) => readableLabel(topicLabel.get(t) || t)).join(', ') }}
          </p>
        </template>
        <p v-if="!summary.missingPersons.length && !summary.missingTopics.length" class="text-slate-400">
          Nessuna persona o topic mancante rispetto al quadro completo.
        </p>
      </div>
    </template>
  </div>
</template>