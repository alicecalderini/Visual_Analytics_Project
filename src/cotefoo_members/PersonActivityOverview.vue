<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { filterStore } from '../shared/filterStore'
import {
  getInitiativeParticipants, getInitiatives, getInitiativeStatusTimeline, getTrips, getPersons, getTopics,
} from '../shared/dataManager'
import { buildPersonTopicSentiment, readableLabel } from '../shared/personTopicSentiment'

const participants = ref([])
const initiatives = ref([])
const timeline = ref([])
const trips = ref([])
const allPersonIds = ref([])
const topicLabel = ref(new Map())
const topicIndustry = ref(new Map())
const loading = ref(true)
const svgRef = ref(null)

onMounted(async () => {
  const [p, init, tl, tr, persons, topics] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(), getInitiativeStatusTimeline(),
    getTrips(), getPersons(), getTopics(),
  ])
  participants.value = p
  initiatives.value = init
  timeline.value = tl
  trips.value = tr
  allPersonIds.value = persons.map((x) => x.id)
  topicLabel.value = new Map(topics.map((t) => [t.id, t.short_topic]))

  const allRows = buildPersonTopicSentiment(p, init)
  const tiMap = new Map()
  for (const r of allRows) {
    const inds = r.industry && r.industry.length ? r.industry : ['unclassified']
    if (!tiMap.has(r.topic_id)) tiMap.set(r.topic_id, new Set())
    inds.forEach((i) => tiMap.get(r.topic_id).add(i))
  }
  topicIndustry.value = new Map([...tiMap.entries()].map(([k, v]) => [k, [...v]]))

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

function statsFor(person, dataset) {
  const initById = new Map(initiatives.value.map((i) => [i.id, i]))
  const myParticipants = participants.value.filter((r) => r.entity_id === person && isKnown(r, dataset))
  const initIds = [...new Set(myParticipants.map((r) => r.initiative_id))]

  const topicIds = [...new Set(initIds.map((id) => initById.get(id)?.topic_id).filter(Boolean))]
  const meetingIds = [...new Set(
    timeline.value.filter((t) => initIds.includes(t.initiative_id) && t.meeting_id).map((t) => t.meeting_id),
  )]
  const myTrips = trips.value.filter((t) => t.person_id === person && isKnown(t, dataset))

  const initiativeDetails = initIds.map((id) => {
    const init = initById.get(id) || {}
    const others = participants.value
      .filter((r) => r.initiative_id === id && r.entity_id !== person && isKnown(r, dataset))
      .map((r) => r.entity_id)
    return {
      id,
      title: init.long_title || init.short_title || id,
      topicId: init.topic_id,
      meetingId: init.created_meeting_id,
      status: init.final_status,
      others,
    }
  }).sort((a, b) => (a.meetingId || '').localeCompare(b.meetingId || ''))

  return {
    counts: [
      { label: 'Initiatives', value: initIds.length },
      { label: 'Topics', value: topicIds.length },
      { label: 'Meetings', value: meetingIds.length },
      { label: 'Trips', value: myTrips.length },
    ],
    topicIds,
    meetingIds: meetingIds.sort(),
    initiativeDetails,
  }
}

const stats = computed(() => {
  if (!filterStore.selectedPerson) return null
  return statsFor(filterStore.selectedPerson, filterStore.activeDataset)
})

const topicsByIndustry = computed(() => {
  if (!stats.value) return []
  const groups = new Map()
  for (const t of stats.value.topicIds) {
    const inds = topicIndustry.value.get(t) || ['unclassified']
    for (const ind of inds) {
      if (!groups.has(ind)) groups.set(ind, [])
      groups.get(ind).push(t)
    }
  }
  const order = ['tourism', 'small vessel', 'large vessel', 'unclassified']
  return order.filter((k) => groups.has(k)).map((k) => ({ industry: k, topics: groups.get(k) }))
})

const globalMax = computed(() => {
  if (loading.value) return 10
  let max = 1
  for (const person of allPersonIds.value) {
    for (const dataset of ['journalist', 'FILAH', 'TROUT']) {
      const s = statsFor(person, dataset)
      for (const c of s.counts) if (c.value > max) max = c.value
    }
  }
  return max
})

function draw() {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  if (!stats.value) return

  const width = 400
  const height = 260
  const margin = { top: 36, right: 12, bottom: 30, left: 40 }
  svg.attr('width', width).attr('height', height)

  const x = d3.scaleBand()
    .domain(stats.value.counts.map((d) => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.35)
  const y = d3.scaleLinear()
    .domain([0, globalMax.value])
    .nice()
    .range([height - margin.bottom, margin.top])

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call((g) => g.select('.domain').remove())
    .selectAll('text').attr('font-size', 13).attr('fill', '#475569')

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').attr('stroke', '#e2e8f0'))
    .selectAll('text').attr('font-size', 11).attr('fill', '#94a3b8')

  svg.selectAll('rect.bar')
    .data(stats.value.counts)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', (d) => x(d.label))
    .attr('width', x.bandwidth())
    .attr('y', (d) => y(d.value))
    .attr('height', (d) => y(0) - y(d.value))
    .attr('rx', 4)
    .attr('fill', '#185ead')

  svg.selectAll('text.value')
    .data(stats.value.counts)
    .join('text')
    .attr('class', 'value')
    .attr('x', (d) => x(d.label) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.value) - 8)
    .attr('text-anchor', 'middle')
    .attr('font-size', 13)
    .attr('font-weight', 600)
    .attr('fill', '#1e293b')
    .text((d) => d.value)
}

watch([stats, globalMax], () => nextTick(draw))
</script>

<template>
  <div class="border border-slate-200 rounded-lg shadow-sm p-4">
    <h2 class="font-semibold text-lg mb-1">
      Activities of selected entity<span v-if="filterStore.selectedPerson">: {{ filterStore.selectedPerson }}</span>
    </h2>
    <p class="text-sm text-slate-400 mb-3">
      Dataset: <b>{{ filterStore.activeDataset }}</b>
    </p>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <div v-else-if="!filterStore.selectedPerson" class="text-slate-400 text-sm py-8 text-center">
      Select a person or organization to see details.
    </div>
    <template v-else>
      <div class="flex flex-wrap gap-8">
        <svg ref="svgRef" class="shrink-0"></svg>

        <div class="flex-1 min-w-[220px]">
          <div class="text-slate-500 text-sm mb-2">Topic on which they expressed on</div>
          <div v-if="!topicsByIndustry.length" class="text-slate-400 text-sm">None.</div>
          <div v-for="g in topicsByIndustry" :key="g.industry" class="mb-3">
            <div class="text-sm font-medium text-slate-600 mb-1">{{ readableLabel(g.industry) }}</div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="t in g.topics" :key="t"
                class="px-2.5 py-1 rounded-full border text-sm focus:outline-none"
                :class="filterStore.selectedTopic === t ? 'bg-[#6d48b5] text-white border-[#6d48b5] hover:bg-[#6d48b5]' : 'bg-white border-slate-300 hover:bg-slate-50'"
                @click="filterStore.selectedTopic = filterStore.selectedTopic === t ? null : t"
              >{{ readableLabel(topicLabel.get(t) || t) }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 pt-4 border-t border-slate-100">
        <div class="text-slate-500 text-sm mb-2">
          Initiatives ({{ stats.initiativeDetails.length }})
        </div>
        <ul class="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
          <li v-for="init in stats.initiativeDetails" :key="init.id" class="text-base border-b border-slate-100 pb-3">
            <div class="font-medium">{{ init.title }}</div>
            <div class="text-sm text-slate-500 mt-1 leading-relaxed">
              <div>stato: <b class="text-slate-600">{{ readableLabel(init.status) || 'n/d' }}</b></div>
              <div v-if="init.meetingId">parte di <b class="text-slate-600">{{ readableLabel(init.meetingId) }}</b></div>
              <div>topic <b class="text-slate-600">{{ readableLabel(topicLabel.get(init.topicId) || init.topicId) }}</b></div>
              <div v-if="init.others.length">con {{ init.others.join(', ') }}</div>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>