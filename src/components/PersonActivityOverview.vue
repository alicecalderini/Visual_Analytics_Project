<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { filterStore } from '../store/filterStore'
import {
  getInitiativeParticipants, getInitiatives, getInitiativeStatusTimeline, getTrips,
} from '../utils/dataManager'

const participants = ref([])
const initiatives = ref([])
const timeline = ref([])
const trips = ref([])
const loading = ref(true)
const svgRef = ref(null)

onMounted(async () => {
  const [p, init, tl, tr] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(), getInitiativeStatusTimeline(), getTrips(),
  ])
  participants.value = p
  initiatives.value = init
  timeline.value = tl
  trips.value = tr
  loading.value = false
  await nextTick()
  draw()
})

function isKnown(row, dataset) {
  if (dataset === 'journalist') return true
  if (dataset === 'FILAH') return row.in_filah
  if (dataset === 'TROUT') return row.in_trout
  return false
}

const stats = computed(() => {
  const person = filterStore.selectedPerson
  if (!person) return null
  const dataset = filterStore.activeDataset

  const initById = new Map(initiatives.value.map((i) => [i.id, i]))
  const initIds = new Set(
    participants.value
      .filter((r) => r.entity_id === person && isKnown(r, dataset))
      .map((r) => r.initiative_id),
  )

  const topicIds = new Set(
    [...initIds].map((id) => initById.get(id)?.topic_id).filter(Boolean),
  )
  const meetingIds = new Set(
    timeline.value
      .filter((t) => initIds.has(t.initiative_id) && t.meeting_id)
      .map((t) => t.meeting_id),
  )
  const tripCount = trips.value.filter(
    (t) => t.person_id === person && isKnown(t, dataset),
  ).length

  return [
    { label: 'Iniziative', value: initIds.size },
    { label: 'Topic', value: topicIds.size },
    { label: 'Meeting', value: meetingIds.size },
    { label: 'Viaggi', value: tripCount },
  ]
})

function draw() {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  if (!stats.value) return

  const width = 380
  const height = 180
  const margin = { top: 10, right: 10, bottom: 26, left: 36 }
  svg.attr('width', width).attr('height', height)

  const x = d3.scaleBand()
    .domain(stats.value.map((d) => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.35)
  const y = d3.scaleLinear()
    .domain([0, Math.max(1, d3.max(stats.value, (d) => d.value))])
    .nice()
    .range([height - margin.bottom, margin.top])

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call((g) => g.select('.domain').remove())
    .selectAll('text').attr('font-size', 11).attr('fill', '#475569')

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-(width - margin.left - margin.right)))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').attr('stroke', '#e2e8f0'))
    .selectAll('text').attr('font-size', 10).attr('fill', '#94a3b8')

  svg.selectAll('rect.bar')
    .data(stats.value)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', (d) => x(d.label))
    .attr('width', x.bandwidth())
    .attr('y', (d) => y(d.value))
    .attr('height', (d) => y(0) - y(d.value))
    .attr('rx', 4)
    .attr('fill', '#4f46e5')

  svg.selectAll('text.value')
    .data(stats.value)
    .join('text')
    .attr('class', 'value')
    .attr('x', (d) => x(d.label) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.value) - 6)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('fill', '#1e293b')
    .text((d) => d.value)
}

watch([stats], () => nextTick(draw))
</script>

<template>
  <div class="border border-slate-200 rounded-lg p-4">
    <h2 class="font-semibold mb-1">Attività della persona selezionata</h2>
    <p class="text-xs text-slate-400 mb-3">
      Dataset: <b>{{ filterStore.activeDataset }}</b>
    </p>

    <div v-if="loading" class="text-slate-400 text-sm">Caricamento...</div>
    <div v-else-if="!filterStore.selectedPerson" class="text-slate-400 text-sm py-8 text-center">
      Seleziona una persona dalla sidebar per vedere i dettagli.
    </div>
    <svg v-else ref="svgRef"></svg>
  </div>
</template>