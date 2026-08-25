<script setup>
/**
 * TopicSentimentHeatmap
 * ----------------------
 * Heatmap: righe = persone/organizzazioni, colonne = topic, colore = sentiment medio
 * (deduplicato per (entita, topic) tramite utils/personTopicSentiment.js - se la
 * stessa persona ha piu' iniziative sullo stesso topic, conta una volta sola).
 *
 * Controlli:
 *  - dataset attivo (journalist / FILAH / TROUT), condiviso globalmente tramite
 *    FilterSidebar/filterStore: cambiare dataset ricolora la heatmap con una
 *    transizione, mostrando a colpo d'occhio cosa "sparisce" in FILAH/TROUT
 *    rispetto al quadro completo
 *  - tipo di entita' (persona / organizzazione / entrambe) - locale a questo widget
 *  - industria (multi-select, incluso "unclassified" per i topic senza industry) - locale
 *
 * Interazione collegata: cliccando il nome di una riga si aggiorna
 * filterStore.selectedPerson, cosi' altri widget (mappa, profilo persona, ecc.)
 * possono reagire osservando lo stesso store.
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { getInitiativeParticipants, getInitiatives, getTopics } from '../utils/dataManager'
import { filterStore } from '../store/filterStore'
import { buildPersonTopicSentiment, isKnownInDataset } from '../utils/personTopicSentiment'

const loading = ref(true)
const rows = ref([]) // vista deduplicata (entita, topic), da personTopicSentiment.js

const entityTypeFilter = ref('both')    // 'person' | 'organization' | 'both'
const ALL_INDUSTRIES = ['small vessel', 'large vessel', 'tourism', 'unclassified']
const selectedIndustries = ref(new Set(ALL_INDUSTRIES))

const containerRef = ref(null)
// margine superiore e destro: partono da una base minima e si CORREGGONO DA SOLI
// misurando quanto le etichette ruotate sporgono davvero
const topPadding = ref(0)
const rightPadding = ref(0)
const BASE_TOP = 40
const BASE_RIGHT = 10

onMounted(async () => {
  const [participants, initiatives] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(),
  ])
  rows.value = buildPersonTopicSentiment(participants, initiatives)
  loading.value = false
  await nextTick()
  draw()
})

function industryOf(row) {
  return row.industry && row.industry.length ? row.industry : ['unclassified']
}

const filteredTopicIds = computed(() => {
  const ids = new Set()
  for (const row of rows.value) {
    if (industryOf(row).some((i) => selectedIndustries.value.has(i))) ids.add(row.topic_id)
  }
  return ids
})

const filteredEntityIds = computed(() => {
  const ids = new Set()
  for (const row of rows.value) {
    if (entityTypeFilter.value === 'person' && row.entity_type !== 'entity.person') continue
    if (entityTypeFilter.value === 'organization' && row.entity_type !== 'entity.organization') continue
    ids.add(row.entity_id)
  }
  return ids
})

const cells = computed(() => {
  const dataset = filterStore.activeDataset
  return rows.value
    .filter((row) => {
      if (row.sentiment === null || row.sentiment === undefined) return false
      if (!filteredEntityIds.value.has(row.entity_id)) return false
      if (!filteredTopicIds.value.has(row.topic_id)) return false
      if (!isKnownInDataset(row, dataset)) return false
      return true
    })
    .map((row) => ({
      entityId: row.entity_id,
      topicId: row.topic_id,
      sentiment: row.sentiment,
      reason: row.reason,
    }))
})

const rowIds = computed(() => Array.from(new Set(cells.value.map((c) => c.entityId))).sort())
const colIds = computed(() => Array.from(new Set(cells.value.map((c) => c.topicId))).sort())

function toggleIndustry(ind) {
  const s = new Set(selectedIndustries.value)
  if (s.has(ind)) s.delete(ind); else s.add(ind)
  selectedIndustries.value = s
}

function selectEntity(id) {
  filterStore.selectedPerson = id
}
const margin = computed(() => ({
  top: BASE_TOP + topPadding.value,
  right: BASE_RIGHT + rightPadding.value,
  bottom: 10,
  left: 160,
}))
const cellSize = 26

function draw() {

  if (!containerRef.value) return
  const rowsD = rowIds.value
  const cols = colIds.value
  const m = margin.value

  const width = m.left + cols.length * cellSize + m.right
  const height = m.top + rowsD.length * cellSize + m.bottom

  const svg = d3.select(containerRef.value)
    .attr('width', width)
    .attr('height', height)
    .style('overflow', 'visible')

  const x = d3.scaleBand().domain(cols).range([m.left, m.left + cols.length * cellSize]).padding(0.06)
  const y = d3.scaleBand().domain(rowsD).range([m.top, m.top + rowsD.length * cellSize]).padding(0.06)
  const color = d3.scaleSequential(d3.interpolateRdYlGn).domain([-1, 1])

  let tooltip = d3.select('body').select('.tsh-tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'tsh-tooltip')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('background', '#0f172a')
      .style('color', 'white')
      .style('padding', '6px 10px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('max-width', '260px')
      .style('opacity', 0)
      .style('z-index', 50)
  }

const colLabels = svg.selectAll('text.col-label').data(cols, (d) => d)
colLabels.exit().remove()
colLabels.enter().append('text')
  .attr('class', 'col-label')
  .attr('text-anchor', 'start')
  .style('font-size', '11px')
  .style('cursor', 'pointer')
  .on('mouseenter click', (event, d) => { filterStore.selectedTopic = d })
  .merge(colLabels)
  .attr('transform', (d) => `translate(${x(d) + x.bandwidth() / 2},${m.top - 8}) rotate(-55)`)
  .style('fill', (d) => (filterStore.selectedTopic === d ? '#2563eb' : '#334155'))
  .style('font-weight', (d) => (filterStore.selectedTopic === d ? 700 : 400))
  .text((d) => d)

  const rowLabels = svg.selectAll('text.row-label').data(rowsD, (d) => d)
  rowLabels.exit().remove()
  rowLabels.enter().append('text')
    .attr('class', 'row-label')
    .attr('text-anchor', 'end')
    .style('font-size', '12px')
    .style('cursor', 'pointer')
    .on('click', (event, d) => selectEntity(d))
    .merge(rowLabels)
    .attr('x', m.left - 8)
    .attr('y', (d) => y(d) + y.bandwidth() / 2)
    .attr('dy', '0.32em')
    .style('fill', (d) => (filterStore.selectedPerson === d ? '#2563eb' : '#334155'))
    .style('font-weight', (d) => (filterStore.selectedPerson === d ? 700 : 400))
    .text((d) => d)

  const key = (d) => `${d.entityId}|${d.topicId}`
  svg.selectAll('rect.cell')
    .data(cells.value, key)
    .join(
      (enter) => enter.append('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.topicId))
        .attr('y', (d) => y(d.entityId))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('rx', 3)
        .style('fill', (d) => color(d.sentiment))
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .call((enter) => enter.transition().duration(300).style('opacity', 1)),
      (update) => update
        .call((update) => update.transition().duration(300)
          .attr('x', (d) => x(d.topicId))
          .attr('y', (d) => y(d.entityId))
          .style('fill', (d) => color(d.sentiment))
          .style('opacity', 1)),
      (exit) => exit.call((exit) => exit.transition().duration(200).style('opacity', 0).remove()),
    )
    .on('mouseenter', (event, d) => {
      tooltip.style('opacity', 1).html(
        `<b>${d.entityId}</b><br/>topic: ${d.topicId}<br/>sentiment: ${d.sentiment}` +
        (d.reason ? `<br/><i>${d.reason}</i>` : ''),
      )
    })
    .on('mousemove', (event) => {
      tooltip.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY + 12}px`)
    })
    .on('mouseleave', () => tooltip.style('opacity', 0))
    .on('click', (event, d) => selectEntity(d.entityId))

      // misura reale: quanto sporgono le etichette ruotate oltre il bordo alto dell'SVG?
  nextTick(() => {
    const svgEl = containerRef.value
    if (!svgEl) return
    const svgRect = svgEl.getBoundingClientRect()
    let minTop = svgRect.top
    let maxRight = svgRect.right
    svg.selectAll('text.col-label').each(function () {
      const r = this.getBoundingClientRect()
      if (r.top < minTop) minTop = r.top
      if (r.right > maxRight) maxRight = r.right
    })
    const topOverflow = svgRect.top - minTop
    const rightOverflow = maxRight - svgRect.right
    if (topOverflow > 2) topPadding.value = topPadding.value + Math.ceil(topOverflow) + 6
    if (rightOverflow > 2) rightPadding.value = rightPadding.value + Math.ceil(rightOverflow) + 6
  })

}

watch([cells, rowIds, colIds, () => filterStore.activeDataset], () => draw())
watch(() => filterStore.selectedPerson, () => draw())
watch(() => filterStore.selectedTopic, () => draw())
watch(topPadding, () => draw())
watch(rightPadding, () => draw())
</script>

<template>
  <div class="p-4">
    <h2 class="text-lg font-semibold mb-3">Sentiment per persona/organizzazione e topic</h2>

    <div class="flex flex-wrap items-center gap-4 mb-4 text-sm">
      <div class="flex items-center gap-1">
        <span class="text-slate-500 mr-1">Mostra:</span>
        <button
          v-for="opt in [['both','Entrambi'],['person','Persone'],['organization','Organizzazioni']]" :key="opt[0]"
          class="px-2.5 py-1 rounded-md border"
          :class="entityTypeFilter === opt[0] ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300 hover:bg-slate-50'"
          @click="entityTypeFilter = opt[0]"
        >{{ opt[1] }}</button>
      </div>

      <div class="flex items-center gap-1 flex-wrap">
        <span class="text-slate-500 mr-1">Industria:</span>
        <button
          v-for="ind in ALL_INDUSTRIES" :key="ind"
          class="px-2.5 py-1 rounded-full border text-xs"
          :class="selectedIndustries.has(ind) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300 hover:bg-slate-50'"
          @click="toggleIndustry(ind)"
        >{{ ind }}</button>
      </div>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm">Caricamento...</div>
   
    <div v-else class="inline-block max-w-full overflow-auto border border-slate-200 rounded-lg">
      <svg ref="containerRef"></svg>
    </div>
  </div>
</template>