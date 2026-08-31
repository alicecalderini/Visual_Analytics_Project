<script setup>
import { ref, computed, onMounted } from 'vue'
import { filterStore } from '../shared/filterStore'
import { getInitiativeParticipants, getInitiatives, getTopics } from '../shared/dataManager'
import { buildPersonTopicSentiment, isKnownInDataset, readableLabel } from '../shared/personTopicSentiment'

const rows = ref([])
const topicLabel = ref(new Map())
const loading = ref(true)

onMounted(async () => {
  const [participants, initiatives, topics] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(), getTopics(),
  ])
  rows.value = buildPersonTopicSentiment(participants, initiatives)
  topicLabel.value = new Map(topics.map((t) => [t.id, t.short_topic]))
  loading.value = false
})

const voices = computed(() => {
  if (!filterStore.selectedTopic) return []
  return rows.value
    .filter((r) => r.topic_id === filterStore.selectedTopic
      && r.sentiment !== null
      && isKnownInDataset(r, filterStore.activeDataset))
    .sort((a, b) => b.sentiment - a.sentiment)
})

function sentimentColor(s) {
  if (s > 0.15) return 'text-emerald-600'
  if (s < -0.15) return 'text-rose-600'
  return 'text-slate-500'
}
</script>

<template>
  <div class="border border-slate-200 rounded-lg p-4 w-[420px] shrink-0">
    <h2 class="font-semibold text-lg mb-1">Who says that?</h2>
    <p class="text-sm text-slate-400 mb-3">
      Dataset: <b>{{ filterStore.activeDataset }}</b>
    </p>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <div v-else-if="!filterStore.selectedTopic" class="text-slate-400 text-sm py-8 text-center">
      Hover over a bar on the left to see individual opinions.
    </div>
    <div v-else>
      <div class="font-medium text-base mb-2">
        {{ readableLabel(topicLabel.get(filterStore.selectedTopic) || filterStore.selectedTopic) }}
      </div>
      <div v-if="!voices.length" class="text-slate-400 text-sm">
        Nessuna opinione nota a questo dataset.
      </div>
      <ul v-else class="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
        <li v-for="v in voices" :key="v.entity_id" class="text-base border-b border-slate-100 pb-3">
          <div class="flex justify-between items-baseline">
            <button
              class="font-medium hover:underline"
              @click="filterStore.selectedPerson = v.entity_id"
            >{{ v.entity_id }}</button>
            <span :class="sentimentColor(v.sentiment)" class="font-semibold">{{ v.sentiment }}</span>
          </div>
          <p v-if="v.reason" class="text-slate-500 text-sm mt-1 break-words">{{ v.reason }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>