<script setup>

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { getInitiativeParticipants } from '../shared/dataManager'

const DATASETS = [
  { key: 'journalist', label: 'journalist', color: '#78716c' },
  { key: 'FILAH', label: 'FILAH', color: '#0d9488' },
  { key: 'TROUT', label: 'TROUT', color: '#db2777' },
]

const props = defineProps({ aggregateFishing: { type: Boolean, default: false } })

const participants = ref([])
const loading = ref(true)
const svgRef = ref(null)
const wrapperRef = ref(null)
const svgWidth = ref(900)

onMounted(async () => {
  participants.value = await getInitiativeParticipants()
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

const categories = computed(() => (
  props.aggregateFishing ? ['tourism', 'fishing', 'unclassified'] : ['tourism', 'small vessel', 'large vessel', 'unclassified']
))

const counts = computed(() => {

  const exploded = []
  for (const p of participants.value) {
    let inds = p.industry && p.industry.length ? p.industry : ['unclassified']
    if (props.aggregateFishing) {
      inds = inds.map((i) => (i === 'small vessel' || i === 'large vessel' ? 'fishing' : i))
    }
    for (const ind of inds) {
      exploded.push({ initiative_id: p.initiative_id, industry: ind, in_filah: p.in_filah, in_trout: p.in_trout })
    }
  }

  const groups = new Map()
  for (const e of exploded) {
    const key = `${e.initiative_id}|${e.industry}`
    if (!groups.has(key)) groups.set(key, { initiative_id: e.initiative_id, industry: e.industry, in_filah: false, in_trout: false })
    const g = groups.get(key)
    g.in_filah = g.in_filah || !!e.in_filah
    g.in_trout = g.in_trout || !!e.in_trout
  }

  const tally = Object.fromEntries(categories.value.map((c) => [c, { journalist: new Set(), FILAH: new Set(), TROUT: new Set() }]))
  for (const g of groups.values()) {
    if (!tally[g.industry]) continue
    tally[g.industry].journalist.add(g.initiative_id)
    if (g.in_filah) tally[g.industry].FILAH.add(g.initiative_id)
    if (g.in_trout) tally[g.industry].TROUT.add(g.initiative_id)
  }

  return categories.value.map((cat) => ({
    category: cat,
    journalist: tally[cat].journalist.size,
    FILAH: tally[cat].FILAH.size,
    TROUT: tally[cat].TROUT.size,
  }))
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
      tooltip.style('opacity', 1).html(`<b>${d.label}</b><br/>${d.category}: ${d.value} initiatives`)
    })
    .on('mousemove', (event) => tooltip.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY + 12}px`))
    .on('mouseleave', () => tooltip.style('opacity', 0))
}

watch([counts, svgWidth], () => nextTick(draw))
</script>

<template>
  <div class="border border-slate-200 rounded-lg shadow-sm p-4">
    <h2 class="text-lg font-semibold mb-1">Initiatives by industries and dataset</h2>
 

    <div class="flex flex-wrap gap-4 mb-3 text-sm">
      <span v-for="ds in DATASETS" :key="ds.key" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm inline-block" :style="{ backgroundColor: ds.color }"></span>
        <span class="text-slate-600">{{ ds.label }}</span>
      </span>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <div v-else ref="wrapperRef" class="w-full">
      <svg ref="svgRef"></svg>
    </div>
  </div>
</template>