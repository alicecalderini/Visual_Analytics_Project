<script setup>
/**
 * Complementare a "Bias tra industrie": quello misura il TONO (cosa dicono),
 * questo misura la COPERTURA (di cosa si parla affatto). Se un dataset taglia
 * intere iniziative su un'industria, si vede subito confrontando le barre.
 * Le 3 barre (journalist/FILAH/TROUT) sono sempre visibili fianco a fianco,
 * non serve selezionare un dataset per volta.
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { getInitiativeParticipants, getInitiatives } from '../utils/dataManager'
import { buildPersonTopicSentiment } from '../utils/personTopicSentiment'

const CATEGORIES = ['tourism', 'small vessel', 'large vessel', 'unclassified']
const DATASETS = [
  { key: 'journalist', label: 'journalist', color: '#0f172a' },
  { key: 'FILAH', label: 'FILAH', color: '#f97316' },
  { key: 'TROUT', label: 'TROUT', color: '#2563eb' },
]

const initiatives = ref([])
const topicIndustry = ref(new Map())
const loading = ref(true)
const svgRef = ref(null)
const wrapperRef = ref(null)
const svgWidth = ref(900)

onMounted(async () => {
  const [participants, init] = await Promise.all([getInitiativeParticipants(), getInitiatives()])
  initiatives.value = init

  const rows = buildPersonTopicSentiment(participants, init)
  const map = new Map()
  for (const r of rows) {
    const inds = r.industry && r.industry.length ? r.industry : ['unclassified']
    if (!map.has(r.topic_id)) map.set(r.topic_id, new Set())
    inds.forEach((i) => map.get(r.topic_id).add(i))
  }
  topicIndustry.value = new Map([...map.entries()].map(([k, v]) => [k, [...v]]))

  loading.value = false
  await nextTick()
  if (wrapperRef.value) {
    const measure = () => { svgWidth.value = Math.max(600, wrapperRef.value.clientWidth) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrapperRef.value)
  }
  draw()
})

function isKnown(init, datasetKey) {
  if (datasetKey === 'journalist') return true
  return datasetKey === 'FILAH' ? init.in_filah : init.in_trout
}

const counts = computed(() => {
  return CATEGORIES.map((cat) => {
    const perDataset = {}
    for (const ds of DATASETS) {
      const ids = new Set()
      for (const init of initiatives.value) {
        if (!isKnown(init, ds.key)) continue
        const inds = topicIndustry.value.get(init.topic_id) || ['unclassified']
        if (inds.includes(cat)) ids.add(init.id)
      }
      perDataset[ds.key] = ids.size
    }
    return { category: cat, ...perDataset }
  })
})

function draw() {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  const data = counts.value
  if (!data.length) return

  const width = svgWidth.value
  const height = 280
  const margin = { top: 20, right: 20, bottom: 30, left: 40 }
  svg.attr('width', width).attr('height', height)

  const x0 = d3.scaleBand().domain(data.map((d) => d.category)).range([margin.left, width - margin.right]).padding(0.25)
  const x1 = d3.scaleBand().domain(DATASETS.map((d) => d.key)).range([0, x0.bandwidth()]).padding(0.12)
  const maxVal = d3.max(data, (d) => Math.max(d.journalist, d.FILAH, d.TROUT)) || 1
  const y = d3.scaleLinear().domain([0, maxVal]).nice().range([height - margin.bottom, margin.top])

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .call((g) => g.select('.domain').attr('stroke', '#e2e8f0'))
    .selectAll('text').attr('font-size', 12).attr('fill', '#475569').style('text-transform', 'capitalize')

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').attr('stroke', '#f1f5f9'))
    .selectAll('text').attr('font-size', 10).attr('fill', '#94a3b8')

  const groups = svg.selectAll('g.cat-group').data(data).join('g')
    .attr('class', 'cat-group')
    .attr('transform', (d) => `translate(${x0(d.category)},0)`)

  let tooltip = d3.select('body').select('.iby-tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'iby-tooltip')
      .style('position', 'fixed').style('pointer-events', 'none')
      .style('background', 'white').style('color', '#0f172a')
      .style('border', '1px solid #e2e8f0')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
      .style('padding', '6px 10px').style('border-radius', '6px')
      .style('font-size', '12px').style('opacity', 0).style('z-index', 50)
  }

  groups.selectAll('rect')
    .data((d) => DATASETS.map((ds) => ({ ...ds, value: d[ds.key], category: d.category })))
    .join('rect')
    .attr('x', (d) => x1(d.key))
    .attr('width', x1.bandwidth())
    .attr('y', (d) => y(d.value))
    .attr('height', (d) => y(0) - y(d.value))
    .attr('rx', 2)
    .attr('fill', (d) => d.color)
    .on('mouseenter', (event, d) => {
      tooltip.style('opacity', 1).html(`<b>${d.label}</b><br/>${d.category}: ${d.value} iniziative`)
    })
    .on('mousemove', (event) => tooltip.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY + 12}px`))
    .on('mouseleave', () => tooltip.style('opacity', 0))
}

watch([counts, svgWidth], () => nextTick(draw))
</script>

<template>
  <div class="border border-slate-200 rounded-lg p-4">
    <h2 class="text-lg font-semibold mb-1">Iniziative per industria e dataset</h2>
    <p class="text-sm text-slate-400 mb-3">
      Copertura, non tono: quante iniziative sono note in ciascun dataset, per industria
    </p>

    <div class="flex flex-wrap gap-4 mb-3 text-sm">
      <span v-for="ds in DATASETS" :key="ds.key" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm inline-block" :style="{ backgroundColor: ds.color }"></span>
        <span class="text-slate-600">{{ ds.label }}</span>
      </span>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm">Caricamento...</div>
    <div v-else ref="wrapperRef" class="w-full">
      <svg ref="svgRef"></svg>
    </div>
  </div>
</template>