<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { filterStore } from '../shared/filterStore'
import { getInitiativeParticipants, getInitiatives, getTopics } from '../shared/dataManager'
import { buildPersonTopicSentiment, isKnownInDataset, readableLabel } from '../shared/personTopicSentiment'

const rows = ref([])
const topicLabel = ref(new Map())
const loading = ref(true)
const svgRef = ref(null)

onMounted(async () => {
  const [participants, initiatives, topics] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(), getTopics(),
  ])
  rows.value = buildPersonTopicSentiment(participants, initiatives)
  topicLabel.value = new Map(topics.map((t) => [t.id, t.short_topic]))
  loading.value = false
  await nextTick()
  draw()
})

const topicAverages = computed(() => {
  const dataset = filterStore.activeDataset
  const byTopic = new Map()
  for (const r of rows.value) {
    if (r.sentiment === null || !isKnownInDataset(r, dataset)) continue
    if (!byTopic.has(r.topic_id)) byTopic.set(r.topic_id, [])
    byTopic.get(r.topic_id).push(r)
  }

  const person = filterStore.selectedPerson
  const out = []
  for (const [topicId, items] of byTopic.entries()) {
    const avg = d3.mean(items, (d) => d.sentiment)
    const personRow = person ? items.find((d) => d.entity_id === person) : null
    out.push({
      topicId,
      label: readableLabel(topicLabel.value.get(topicId) || topicId),
      avg,
      n: items.length,
      personSentiment: personRow ? personRow.sentiment : null,
    })
  }
  return out.sort((a, b) => b.avg - a.avg)
})

function draw() {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  const data = topicAverages.value
  if (!data.length) return

  const width = 560
  const rowHeight = 28
  const margin = { top: 10, right: 46, bottom: 30, left: 180 }
  const height = margin.top + margin.bottom + data.length * rowHeight
  svg.attr('width', width).attr('height', height)

  const x = d3.scaleLinear().domain([-1, 1]).range([margin.left, width - margin.right])
  const y = d3.scaleBand()
    .domain(data.map((d) => d.topicId))
    .range([margin.top, height - margin.bottom])
    .padding(0.25)
  const color = d3.scaleDiverging(d3.interpolateRdYlGn).domain([-1, 0, 1])

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5))
    .call((g) => g.selectAll('text').attr('font-size', 12).attr('fill', '#94a3b8'))
    .call((g) => g.select('.domain').attr('stroke', '#e2e8f0'))

  svg.append('line')
    .attr('x1', x(0)).attr('x2', x(0))
    .attr('y1', margin.top).attr('y2', height - margin.bottom)
    .attr('stroke', '#cbd5e1')

  const row = svg.selectAll('g.row')
    .data(data, (d) => d.topicId)
    .join('g')
    .attr('class', 'row')
    .attr('transform', (d) => `translate(0,${y(d.topicId)})`)
    .style('cursor', 'pointer')
    .on('mouseenter click', (_, d) => { filterStore.selectedTopic = d.topicId })

  row.append('text')
    .attr('x', margin.left - 10)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.32em')
    .attr('text-anchor', 'end')
    .attr('font-size', 13)
    .attr('font-weight', (d) => (d.topicId === filterStore.selectedTopic ? 700 : 400))
    .attr('fill', (d) => (d.topicId === filterStore.selectedTopic ? '#0f172a' : '#475569'))
    .text((d) => d.label)

  row.append('rect')
    .attr('x', (d) => Math.min(x(0), x(d.avg)))
    .attr('width', (d) => Math.abs(x(d.avg) - x(0)))
    .attr('y', 2)
    .attr('height', y.bandwidth() - 4)
    .attr('rx', 3)
    .attr('fill', (d) => color(d.avg))
    .attr('opacity', (d) => (filterStore.selectedTopic && d.topicId !== filterStore.selectedTopic ? 0.4 : 1))

  row.filter((d) => d.personSentiment !== null)
    .append('circle')
    .attr('cx', (d) => x(d.personSentiment))
    .attr('cy', y.bandwidth() / 2)
    .attr('r', 5)
    .attr('fill', '#fff')
    .attr('stroke', '#0f172a')
    .attr('stroke-width', 2)
}

watch([topicAverages, () => filterStore.selectedTopic], () => nextTick(draw))
</script>

<template>
  <div class="border border-slate-200 rounded-lg p-4">
    <h2 class="font-semibold text-lg mb-1">Average sentiment by topic</h2>
    <p class="text-sm text-slate-400 mb-3">
      Dataset: <b>{{ filterStore.activeDataset }}</b>
      <span v-if="filterStore.selectedPerson"> — white circle = position of <b>{{ filterStore.selectedPerson }}</b></span>
    </p>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <svg v-else ref="svgRef"></svg>
  </div>
</template>