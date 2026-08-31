<script setup>

import { ref, computed, onMounted, watch } from 'vue'
import { filterStore } from '../shared/filterStore'
import { getInitiativeParticipants, getInitiatives, getPersons, getOrganizations } from '../shared/dataManager'
import { buildPersonTopicSentiment, isKnownInDataset, readableLabel } from '../shared/personTopicSentiment'

const props = defineProps({ aggregateFishing: { type: Boolean, default: false } })

const rows = ref([])
const entityMeta = ref(new Map()) // id -> { name, type }
const loading = ref(true)

const categoryRows = computed(() => (
  props.aggregateFishing ? [['tourism', 'unclassified', 'fishing']] : [['tourism', 'unclassified'], ['small vessel', 'large vessel']]
))

const groupA = ref(new Set(['tourism']))
const groupB = ref(new Set(['small vessel', 'large vessel']))
const entityTypeFilter = ref('both')
const selected = ref(null) // { entityId, group: 'A' | 'B' }

watch(() => props.aggregateFishing, (agg) => {
  groupA.value = new Set(['tourism'])
  groupB.value = new Set(agg ? ['fishing'] : ['small vessel', 'large vessel'])
  selected.value = null
})

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
  const raw = row.industry && row.industry.length ? row.industry : ['unclassified']
  if (!props.aggregateFishing) return raw
  return raw.map((i) => (i === 'small vessel' || i === 'large vessel' ? 'fishing' : i))
}

function clusterOf(cat) {
  return (cat === 'small vessel' || cat === 'large vessel') ? 'fishing' : cat
}

function toggleCategory(group, cat) {
  const current = group === 'A' ? groupA.value : groupB.value
  const otherSet = group === 'A' ? groupB.value : groupA.value
  const newOther = new Set(otherSet)
  newOther.delete(cat) // a category cannot stay in both groups

  let newCurrent
  if (current.has(cat)) {
    newCurrent = new Set(current)
    newCurrent.delete(cat)
  } else {
    const currentCluster = current.size ? clusterOf([...current][0]) : null
    newCurrent = currentCluster === clusterOf(cat) ? new Set([...current, cat]) : new Set([cat])
  }

  if (group === 'A') { groupA.value = newCurrent; groupB.value = newOther }
  else { groupB.value = newCurrent; groupA.value = newOther }
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
    <h2 class="text-lg font-semibold mb-4">Weighing the bias among industries</h2>

    <div class="flex items-center gap-3 mb-5 text-sm">
      <span class="text-slate-500">Show</span>
      <button
        v-for="opt in [['both','Entrambi'],['person','Persone'],['organization','Organizzazioni']]" :key="opt[0]"
        class="px-2.5 py-1 rounded-md border"
        :class="entityTypeFilter === opt[0]
          ? 'bg-slate-200 text-slate-900 border-slate-300 font-medium'
          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'"
        @click="entityTypeFilter = opt[0]"
      >{{ opt[1] }}</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-6 mb-5">
      <div class="flex items-start gap-2 text-sm">
        <span class="text-slate-500 w-16 shrink-0 pt-1.5">Group A</span>
        <div class="flex flex-col gap-1.5">
          <div v-for="(row, ri) in categoryRows" :key="ri" class="flex flex-wrap gap-1.5">
            <button
              v-for="c in row" :key="'a' + c"
              class="px-2.5 py-1 rounded-full border text-xs capitalize"
              :class="groupA.has(c) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300 hover:bg-slate-50'"
              @click="toggleCategory('A', c)"
            >{{ c }}</button>
          </div>
        </div>
      </div>
      <div class="flex items-start gap-2 text-sm">
        <span class="text-slate-500 w-16 shrink-0 pt-1.5">Group B</span>
        <div class="flex flex-col gap-1.5">
          <div v-for="(row, ri) in categoryRows" :key="ri" class="flex flex-wrap gap-1.5">
            <button
              v-for="c in row" :key="'b' + c"
              class="px-2.5 py-1 rounded-full border text-xs capitalize"
              :class="groupB.has(c) ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-slate-300 hover:bg-slate-50'"
              @click="toggleCategory('B', c)"
            >{{ c }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-6 items-start">
      <div>
        <div class="text-sm text-slate-500 mb-1 capitalize">{{ groupLabel(groupA) }}</div>
        <div class="text-2xl font-bold mb-3" :class="sideA.grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'">
          {{ sideA.grandTotal >= 0 ? '+' : '' }}{{ sideA.grandTotal.toFixed(2) }}
        </div>
        <div v-if="!sideA.items.length" class="text-slate-400 text-sm">No known opinion.</div>
        <div v-for="it in sideA.items" :key="it.entityId" class="mb-1.5">
          <button class="w-full flex items-center gap-2 group" @click="selectEntity(it.entityId, 'A')">
            <span
              :title="it.name"
              class="w-28 text-sm text-right truncate shrink-0 transition-colors"
              :class="selected?.entityId === it.entityId && selected?.group === 'A'
                ? 'font-semibold text-indigo-700'
                : 'text-slate-600 group-hover:text-indigo-600'"
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
        <div v-if="!sideB.items.length" class="text-slate-400 text-sm">No known opinions.</div>
        <div v-for="it in sideB.items" :key="it.entityId" class="mb-1.5">
          <button class="w-full flex items-center gap-2 group" @click="selectEntity(it.entityId, 'B')">
            <span
              :title="it.name"
              class="w-28 text-sm text-right truncate shrink-0 transition-colors"
              :class="selected?.entityId === it.entityId && selected?.group === 'B'
                ? 'font-semibold text-indigo-700'
                : 'text-slate-600 group-hover:text-indigo-600'"
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
          Click on a person/organization to see the detail of their sentiment on this group of industries.
        </div>
        <div v-else>
          <div class="font-semibold text-base mb-1">{{ detail.name }}</div>
          <div class="text-sm text-slate-500 mb-3">
            Total: <b :class="detail.total >= 0 ? 'text-emerald-600' : 'text-rose-600'">{{ detail.total >= 0 ? '+' : '' }}{{ detail.total.toFixed(2) }}</b>
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