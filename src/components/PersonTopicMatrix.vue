<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { filterStore } from '../store/filterStore'
import { getInitiativeParticipants, getInitiatives, getTopics, getPersons, getOrganizations } from '../utils/dataManager'
import { buildPersonTopicSentiment, isKnownInDataset } from '../utils/personTopicSentiment'

const svgRef = ref(null)
const tooltipRef = ref(null)

const loading = ref(true)
const rows = ref([])
const topicLabel = ref(new Map())
const entityName = ref(new Map())

const entityTypeFilter = ref('both')
const INDUSTRY_OPTIONS = ['small vessel', 'large vessel', 'tourism', 'nessuna industria']
const selectedIndustries = ref(new Set(INDUSTRY_OPTIONS))

function toggleIndustry(ind) {
  const s = new Set(selectedIndustries.value)
  if (s.has(ind)) s.delete(ind)
  else s.add(ind)
  selectedIndustries.value = s
}

onMounted(async () => {
  const [participants, initiatives, topics, persons, organizations] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(), getTopics(), getPersons(), getOrganizations(),
  ])

  rows.value = buildPersonTopicSentiment(participants, initiatives)
  topicLabel.value = new Map(topics.map((t) => [t.id, t.short_topic]))
  entityName.value = new Map([
    ...persons.map((p) => [p.id, p.name || p.id]),
    ...organizations.map((o) => [o.id, o.id]),
  ])

  loading.value = false
  await nextTick()
  draw()
})

const topicIndustries = computed(() => {
  const map = new Map()
  for (const r of rows.value) {
    if (!map.has(r.topic_id)) map.set(r.topic_id, new Set())
    const set = map.get(r.topic_id)
    if (r.industry.length === 0) {
      if (r.sentiment !== null) set.add('nessuna industria')
    } else {
      r.industry.forEach((i) => set.add(i))
    }
  }
  return map
})

const visibleTopics = computed(() => {
  const out = []
  for (const [topicId, industries] of topicIndustries.value.entries()) {
    const intersects = [...industries].some((i) => selectedIndustries.value.has(i))
    if (intersects) out.push(topicId)
  }
  return out.sort()
})

const visibleEntities = computed(() => {
  const ids = new Set()
  for (const r of rows.value) {
    if (entityTypeFilter.value === 'person' && r.entity_type !== 'entity.person') continue
    if (entityTypeFilter.value === 'organization' && r.entity_type !== 'entity.organization') continue
    if (!visibleTopics.value.includes(r.topic_id)) continue
    ids.add(r.entity_id)
  }
  return [...ids].sort()
})

const cellLookup = computed(() => {
  const m = new Map()
  for (const r of rows.value) m.set(`${r.entity_id}::${r.topic_id}`, r)
  return m
})

function draw() {
  if (!svgRef.value) return

  const entities = visibleEntities.value
  const topics = visibleTopics.value
  const cellSize = 26
  const margin = { top: 140, right: 10, bottom: 10, left: 160 }
  const width = margin.left + margin.right + topics.length * cellSize
  const height = margin.top + margin.bottom + entities.length * cellSize

  const svg = d3.select(svgRef.value)
  svg.attr('width', width).attr('height', height).attr('viewBox', [0, 0, width, height])
  svg.selectAll('*').remove()

  const defs = svg.append('defs')
  const pattern = defs.append('pattern')
    .attr('id', 'hatch').attr('width', 6).attr('height', 6)
    .attr('patternTransform', 'rotate(45)').attr('patternUnits', 'userSpaceOnUse')
  pattern.append('rect').attr('width', 6).attr('height', 6).attr('fill', '#f1f5f9')
  pattern.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6)
    .attr('stroke', '#cbd5e1').attr('stroke-width', 2)

  const color = d3.scaleDiverging(d3.interpolateRdYlGn).domain([-1, 0, 1])

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const x = d3.scaleBand().domain(topics).range([0, topics.length * cellSize]).padding(0.06)
  const y = d3.scaleBand().domain(entities).range([0, entities.length * cellSize]).padding(0.06)

  const tooltip = d3.select(tooltipRef.value)

  svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .selectAll('text')
    .data(topics)
    .join('text')
    .attr('x', (d) => x(d) + x.bandwidth() / 2)
    .attr('y', -6)
    .attr('transform', (d) => `rotate(-60, ${x(d) + x.bandwidth() / 2}, -6)`)
    .attr('text-anchor', 'start')
    .attr('font-size', 10)
    .attr('fill', '#334155')
    .text((d) => topicLabel.value.get(d) || d)

  svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .selectAll('text')
    .data(entities)
    .join('text')
    .attr('x', -6)
    .attr('y', (d) => y(d) + y.bandwidth() / 2)
    .attr('dy', '0.32em')
    .attr('text-anchor', 'end')
    .attr('font-size', 11)
    .attr('cursor', 'pointer')
    .attr('font-weight', (d) => (d === filterStore.selectedPerson ? 700 : 400))
    .attr('fill', (d) => (d === filterStore.selectedPerson ? '#0f172a' : '#475569'))
    .text((d) => entityName.value.get(d) || d)
    .on('click', (_, d) => {
      filterStore.selectedPerson = filterStore.selectedPerson === d ? null : d
      draw()
    })

  const cellData = []
  for (const e of entities) {
    for (const t of topics) {
      cellData.push({ entity: e, topic: t, row: cellLookup.value.get(`${e}::${t}`) })
    }
  }

  g.selectAll('rect')
    .data(cellData)
    .join('rect')
    .attr('x', (d) => x(d.topic))
    .attr('y', (d) => y(d.entity))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('rx', 3)
    .attr('fill', (d) => {
      if (!d.row || d.row.sentiment === null) return '#f8fafc'
      if (!isKnownInDataset(d.row, filterStore.activeDataset)) return 'url(#hatch)'
      return color(d.row.sentiment)
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .style('cursor', (d) => (d.row ? 'pointer' : 'default'))
    .on('mousemove', (event, d) => {
      if (!d.row) return
      const known = isKnownInDataset(d.row, filterStore.activeDataset)
      tooltip
        .style('opacity', 1)
        .style('left', `${event.offsetX + 16}px`)
        .style('top', `${event.offsetY + 8}px`)
        .html(`
          <div class="font-semibold">${entityName.value.get(d.entity) || d.entity}</div>
          <div>${topicLabel.value.get(d.topic) || d.topic}</div>
          ${d.row.sentiment !== null
            ? `<div>Sentiment: <b>${d.row.sentiment}</b> ${known ? '' : '(non noto a ' + filterStore.activeDataset + ')'}</div>
               <div class="text-slate-400 max-w-[220px]">${d.row.reason || ''}</div>`
            : '<div class="text-slate-400">Nessuna opinione registrata</div>'}
        `)
    })
    .on('mouseleave', () => tooltip.style('opacity', 0))
    .on('click', (_, d) => {
      filterStore.selectedPerson = filterStore.selectedPerson === d.entity ? null : d.entity
      draw()
    })
}

watch([visibleEntities, visibleTopics, () => filterStore.activeDataset], () => {
  nextTick(draw)
})
</script>

<template>
  <div class="border border-slate-200 rounded-lg p-4 relative">
    <h2 class="font-semibold mb-3">Sentiment per persona/organizzazione e topic</h2>

    <div class="flex flex-wrap gap-4 mb-4 text-sm">
      <div>
        <div class="text-slate-500 mb-1">Dataset</div>
        <div class="flex gap-1">
          <button
            v-for="ds in ['journalist', 'FILAH', 'TROUT']"
            :key="ds"
            class="px-2.5 py-1 rounded-md border text-xs"
            :class="filterStore.activeDataset === ds
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
            @click="filterStore.activeDataset = ds"
          >{{ ds }}</button>
        </div>
      </div>

      <div>
        <div class="text-slate-500 mb-1">Mostra</div>
        <div class="flex gap-1">
          <button
            v-for="opt in [['both','Entrambi'],['person','Persone'],['organization','Organizzazioni']]"
            :key="opt[0]"
            class="px-2.5 py-1 rounded-md border text-xs"
            :class="entityTypeFilter === opt[0]
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
            @click="entityTypeFilter = opt[0]"
          >{{ opt[1] }}</button>
        </div>
      </div>

      <div>
        <div class="text-slate-500 mb-1">Industria</div>
        <div class="flex gap-1 flex-wrap max-w-xs">
          <button
            v-for="ind in INDUSTRY_OPTIONS"
            :key="ind"
            class="px-2.5 py-1 rounded-full border text-xs"
            :class="selectedIndustries.has(ind)
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
            @click="toggleIndustry(ind)"
          >{{ ind }}</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm">Caricamento...</div>
    <div v-else class="overflow-auto max-h-[70vh]">
      <svg ref="svgRef"></svg>
    </div>

    <div
      ref="tooltipRef"
      class="pointer-events-none absolute z-10 bg-slate-900 text-white text-xs rounded-md px-2 py-1.5 opacity-0 transition-opacity"
    ></div>
  </div>
</template>