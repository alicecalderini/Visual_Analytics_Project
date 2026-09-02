<script setup>

import { ref, computed, onMounted } from 'vue'
import { filterStore } from '../shared/filterStore'
import { getTrips, getTripStops, getPlaces } from '../shared/dataManager'
import { isKnownInDataset } from '../shared/personTopicSentiment'
import { ZONE_ORDER, zoneColor } from './zones'

const trips = ref([])
const tripStops = ref([])
const placeZone = ref(new Map())
const loading = ref(true)

onMounted(async () => {
  const [tr, ts, pl] = await Promise.all([getTrips(), getTripStops(), getPlaces()])
  trips.value = tr
  tripStops.value = ts
  placeZone.value = new Map(pl.map((p) => [p.id, p.zone]))
  loading.value = false
})

const visibleTrips = computed(() => {
  const dataset = filterStore.activeDataset
  const person = filterStore.selectedPerson
  return trips.value.filter((t) => (
    isKnownInDataset(t, dataset) && (!person || t.person_id === person)
  ))
})

const counts = computed(() => {
  const visibleIds = new Set(visibleTrips.value.map((t) => t.id))
  const tally = Object.fromEntries(ZONE_ORDER.map((z) => [z, 0]))
  for (const s of tripStops.value) {
    if (!visibleIds.has(s.trip_id)) continue
    const zone = placeZone.value.get(s.place_id)
    if (zone && zone in tally) tally[zone] += 1
  }
  const max = Math.max(1, ...Object.values(tally))
  return ZONE_ORDER.map((z) => ({ zone: z, count: tally[z], pct: tally[z] / max }))
})

function toggleZone(z) {
  filterStore.selectedZone = filterStore.selectedZone === z ? null : z
}
</script>

<template>
  <div class="border border-slate-200 rounded-lg shadow-sm p-4">
    <h2 class="font-semibold text-lg mb-1">Stops by zone</h2>
    <p class="text-sm text-slate-400 mb-3">
      Dataset: <b>{{ filterStore.activeDataset }}</b>
      <span v-if="filterStore.selectedPerson"> — only <b>{{ filterStore.selectedPerson }}</b></span>
      · click a zone to highlight it below
    </p>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <div v-else class="flex flex-col gap-2">
      <button
        v-for="c in counts" :key="c.zone"
        class="flex items-center gap-3 group"
        @click="toggleZone(c.zone)"
      >
        <span
          class="w-28 text-sm text-left capitalize shrink-0"
          :class="filterStore.selectedZone === c.zone ? 'font-semibold text-slate-900' : 'text-slate-600'"
        >{{ c.zone }}</span>
        <span class="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
          <span
            class="block h-full rounded transition-all"
            :style="{ width: (c.pct * 100) + '%', backgroundColor: zoneColor(c.zone) }"
            :class="filterStore.selectedZone && filterStore.selectedZone !== c.zone ? 'opacity-30' : ''"
          ></span>
        </span>
        <span class="w-8 text-sm text-slate-500 text-right shrink-0">{{ c.count }}</span>
      </button>
    </div>
  </div>
</template>