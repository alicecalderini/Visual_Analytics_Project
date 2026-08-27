<script setup>
/**
 * Il cuore della pagina: confronta il sentiment aggregato tra due gruppi di
 * industrie a scelta (Tourism vs Fishing, Tourism vs Small vessel, ecc. - o
 * qualunque combinazione l'utente componga).
 *
 * A differenza della "bilancia" di BAIT: qui ogni persona/organizzazione
 * compare SOLO nel lato dove ha davvero espresso un'opinione su
 * quell'industria - non "chi e' contro A finisce visualizzato su B". Il
 * numero e' la SOMMA dei sentiment (stesso calcolo gia' usato nel report:
 * fishing vs tourism), la vista sono due liste a barre orizzontali affiancate,
 * stesso linguaggio visivo di "Sentiment medio per topic" nella pagina Membri.
 *
 * Click su una barra -> pannello a destra con TUTTI i sentiment che
 * compongono quel totale per quella persona (topic, valore, motivazione) -
 * lo stesso tipo di dettaglio che in BAIT appariva cliccando una bolla.
 */
import { ref, computed, onMounted } from 'vue'
import * as d3 from 'd3'
import { filterStore } from '../store/filterStore'
import { getInitiativeParticipants, getInitiatives, getPersons, getOrganizations } from '../utils/dataManager'
import { buildPersonTopicSentiment, isKnownInDataset, readableLabel } from '../utils/personTopicSentiment'

const ALL_CATEGORIES = ['tourism', 'small vessel', 'large vessel', 'unclassified']
const PRESETS = [
  { label: 'Tourism vs Fishing', a: ['tourism'], b: ['small vessel', 'large vessel'] },
  { label: 'Tourism vs Small vessel', a: ['tourism'], b: ['small vessel'] },
  { label: 'Tourism vs Large vessel', a: ['tourism'], b: ['large vessel'] },
  { label: 'Small vs Large vessel', a: ['small vessel'], b: ['large vessel'] },
]

const rows = ref([])
const entityMeta = ref(new Map()) // id -> { name, type }
const loading = ref(true)

const groupA = ref(new Set(PRESETS[0].a))
const groupB = ref(new Set(PRESETS[0].b))
const entityTypeFilter = ref('both')
const selected = ref(null) // { entityId, group: 'A' | 'B' }

onMounted(async () => {
  const [participants, initiatives, persons, orgs] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(), getPersons(), getOrganizations(),
  ])
  rows.value = buildPersonTopicSentiment(participants, initiatives)
  const meta = new Map()
  for (const p of persons) meta.set(p.id, { name: p.name || p.id, type: 'entity.person' })
  for (const o of orgs) meta.set(o.id, { name: o.id, type: 'entity.organization' })
  entityMeta.value = meta
  loading.value = false
})

function industryOf(row) {
  return row.industry && row.industry.length ? row.industry : ['unclassified']
}

function applyPreset(p) {
  groupA.value = new Set(p.a)
  groupB.value = new Set(p.b)
  selected.value = null
}

function toggleCategory(group, cat) {
  const setA = new Set(groupA.value)
  const setB = new Set(groupB.value)
  if (group === 'A') {
    setB.delete(cat)
    if (setA.has(cat)) setA.delete(cat); else setA.add(cat)
  } else {
    setA.delete(cat)
    if (setB.has(cat)) setB.delete(cat); else setB.add(cat)
  }
  groupA.value = setA
  groupB.value = setB
  selected.value = null
}

const filteredRows = computed(() => {
  const dataset = filterStore.activeDataset
  return rows.value.filter((r) => {
    if (r.sentiment === null || r.sentiment === undefined) return false
    if (!isKnownInDataset(r, dataset)) return false
    if (entityTypeFilter.value === 'person' && r.entity_type !== 'entity.person') return false
    if (entityTypeFilter.value === 'organization' && r.entity_type !== 'entity.organization') return false
    return true
  })
})

function buildSide(groupSet) {
  const sums = new Map()
  const contributions = new Map()
  for (const r of filteredRows.value) {
    if (!industryOf(r).some((i) => groupSet.has(i))) continue
    sums.set(r.entity_id, (sums.get(r.entity_id) || 0) + r.sentiment)
    if (!contributions.has(r.entity_id)) contributions.set(r.entity_id, [])
    contributions.get(r.entity_id).push(r)
  }
  const items = [...sums.entries()]
    .map(([entityId, total]) => ({ entityId, total, name: entityMeta.value.get(entityId)?.name || entityId }))
    .sort((a, b) => b.total - a.total)
  const grandTotal = items.reduce((acc, i) => acc + i.total, 0)
  return { items, contributions, grandTotal }
}

const sideA = computed(() => buildSide(groupA.value))
const sideB = computed(() => buildSide(groupB.value))

const groupLabel = (set) => (set.size ? [...set].map((c) => readableLabel(c)).join(' + ') : '(nessuna categoria)')

function selectEntity(entityId, group) {
  if (selected.value && selected.value.entityId === entityId && selected.value.group === group) {
    selected.value = null
  } else {
    selected.value = { entityId, group }
  }
}

const detail = computed(() => {
  if (!selected.value) return null
  const side = selected.value.group === 'A' ? sideA.value : sideB.value
  const rowsFor = (side.contributions.get(selected.value.entityId) || [])
    .slice()
    .sort((a, b) => b.sentiment - a.sentiment)
  return {
    entityId: selected.value.entityId,
    name: entityMeta.value.get(selected.value.entityId)?.name || selected.value.entityId,
    group: selected.value.group,
    total: side.items.find((i) => i.entityId === selected.value.entityId)?.total || 0,
    rows: rowsFor,
  }
})

function barWidth(total, maxAbs) {
  if (!maxAbs) return 0
  return Math.abs(total) / maxAbs * 100
}
</script>

<template>
  <div class="border border-slate-200 rounded-lg p-4">
    <h2 class="text-lg font-semibold mb-4">Bias tra industrie</h2>

    <div class="flex flex-wrap gap-2 mb-3">
      <button
        v-for="p in PRESETS" :key="p.label"
        class="px-2.5 py-1 rounded-md border text-sm bg-white border-slate-300 hover:bg-slate-50"
        @click="applyPreset(p)"
      >{{ p.label }}</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
      <div class="flex items-center gap-2 flex-wrap text-sm">
        <span class="text-slate-500 w-16 shrink-0">Gruppo A</span>
        <button
          v-for="c in ALL_CATEGORIES" :key="'a' + c"
          class="px-2.5 py-1 rounded-full border text-xs capitalize"
          :class="groupA.has(c) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300 hover:bg-slate-50'"
          @click="toggleCategory('A', c)"
        >{{ c }}</button>
      </div>
      <div class="flex items-center gap-2 flex-wrap text-sm">
        <span class="text-slate-500 w-16 shrink-0">Gruppo B</span>
        <button
          v-for="c in ALL_CATEGORIES" :key="'b' + c"
          class="px-2.5 py-1 rounded-full border text-xs capitalize"
          :class="groupB.has(c) ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-slate-300 hover:bg-slate-50'"
          @click="toggleCategory('B', c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="flex items-center gap-3 mb-4 text-sm">
      <span class="text-slate-500">Mostra</span>
      <button
        v-for="opt in [['both','Entrambi'],['person','Persone'],['organization','Organizzazioni']]" :key="opt[0]"
        class="px-2.5 py-1 rounded-md border"
        :class="entityTypeFilter === opt[0] ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300 hover:bg-slate-50'"
        @click="entityTypeFilter = opt[0]"
      >{{ opt[1] }}</button>
      <span class="text-slate-400 ml-auto">Dataset: <b class="text-slate-600">{{ filterStore.activeDataset }}</b></span>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm">Caricamento...</div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-6 items-start">
      <div>
        <div class="text-sm text-slate-500 mb-1 capitalize">{{ groupLabel(groupA) }}</div>
        <div class="text-2xl font-bold mb-3" :class="sideA.grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'">
          {{ sideA.grandTotal >= 0 ? '+' : '' }}{{ sideA.grandTotal.toFixed(2) }}
        </div>
        <div v-if="!sideA.items.length" class="text-slate-400 text-sm">Nessuna opinione nota.</div>
        <div v-for="it in sideA.items" :key="it.entityId" class="mb-1.5">
          <button class="w-full flex items-center gap-2 group" @click="selectEntity(it.entityId, 'A')">
            <span
              class="w-28 text-sm text-right truncate shrink-0"
              :class="selected?.entityId === it.entityId && selected?.group === 'A' ? 'font-semibold text-slate-900' : 'text-slate-600'"
            >{{ it.name }}</span>
            <span class="flex-1 h-4 bg-slate-100 rounded overflow-hidden relative">
              <span
                class="block h-full rounded"
                :class="it.total >= 0 ? 'bg-emerald-400' : 'bg-rose-400'"
                :style="{ width: barWidth(it.total, Math.max(Math.abs(sideA.items[0]?.total || 1), Math.abs(sideB.items[0]?.total || 1))) + '%' }"
              ></span>
            </span>
            <span class="w-10 text-xs text-slate-500 text-left shrink-0">{{ it.total.toFixed(1) }}</span>
          </button>
        </div>
      </div>

      <div>
        <div class="text-sm text-slate-500 mb-1 capitalize">{{ groupLabel(groupB) }}</div>
        <div class="text-2xl font-bold mb-3" :class="sideB.grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'">
          {{ sideB.grandTotal >= 0 ? '+' : '' }}{{ sideB.grandTotal.toFixed(2) }}
        </div>
        <div v-if="!sideB.items.length" class="text-slate-400 text-sm">Nessuna opinione nota.</div>
        <div v-for="it in sideB.items" :key="it.entityId" class="mb-1.5">
          <button class="w-full flex items-center gap-2 group" @click="selectEntity(it.entityId, 'B')">
            <span
              class="w-28 text-sm text-right truncate shrink-0"
              :class="selected?.entityId === it.entityId && selected?.group === 'B' ? 'font-semibold text-slate-900' : 'text-slate-600'"
            >{{ it.name }}</span>
            <span class="flex-1 h-4 bg-slate-100 rounded overflow-hidden relative">
              <span
                class="block h-full rounded"
                :class="it.total >= 0 ? 'bg-emerald-400' : 'bg-rose-400'"
                :style="{ width: barWidth(it.total, Math.max(Math.abs(sideA.items[0]?.total || 1), Math.abs(sideB.items[0]?.total || 1))) + '%' }"
              ></span>
            </span>
            <span class="w-10 text-xs text-slate-500 text-left shrink-0">{{ it.total.toFixed(1) }}</span>
          </button>
        </div>
      </div>

      <div class="border-l border-slate-100 pl-6">
        <div v-if="!detail" class="text-slate-400 text-sm">
          Click su una persona/organizzazione per vedere il dettaglio dei suoi sentiment su questo gruppo di industrie.
        </div>
        <div v-else>
          <div class="font-semibold text-base mb-1">{{ detail.name }}</div>
          <div class="text-sm text-slate-500 mb-3">
            Totale: <b :class="detail.total >= 0 ? 'text-emerald-600' : 'text-rose-600'">{{ detail.total >= 0 ? '+' : '' }}{{ detail.total.toFixed(2) }}</b>
          </div>
          <ul class="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            <li v-for="(r, i) in detail.rows" :key="i" class="text-sm border-b border-slate-100 pb-2">
              <div class="flex justify-between items-baseline">
                <span class="font-medium">{{ readableLabel(r.topic_id) }}</span>
                <span :class="r.sentiment >= 0 ? 'text-emerald-600' : 'text-rose-600'" class="font-semibold">{{ r.sentiment }}</span>
              </div>
              <p v-if="r.reason" class="text-slate-500 text-xs mt-0.5 break-words">{{ r.reason }}</p>
              <p class="text-slate-400 text-xs mt-0.5 capitalize">{{ (r.industry?.length ? r.industry : ['unclassified']).join(', ') }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>