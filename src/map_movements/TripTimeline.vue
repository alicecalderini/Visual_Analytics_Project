<script setup>

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { filterStore } from '../shared/filterStore'
import { getTrips, getTripStops, getPlaces, getPersons } from '../shared/dataManager'
import { isKnownInDataset } from '../shared/personTopicSentiment'
import { zoneColor } from './zones'

const trips = ref([])
const tripStops = ref([])
const placeInfo = ref(new Map()) // id -> { name, zone }
const persons = ref([])
const loading = ref(true)
const containerRef = ref(null)
const wrapperRef = ref(null)
const svgWidth = ref(1040) 

const AVATAR_COLOR = '#b63576'

function fixDate(dateStr) {
  if (!dateStr) return dateStr
  return dateStr.replace(/^0040/, '2040')
}

onMounted(async () => {
  const [tr, ts, pl, ps] = await Promise.all([getTrips(), getTripStops(), getPlaces(), getPersons()])
  trips.value = tr
  tripStops.value = ts
  placeInfo.value = new Map(pl.map((p) => [p.id, { name: p.name, zone: p.zone }]))
  persons.value = ps
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

const dateExtent = computed(() => {
  if (!trips.value.length) return [new Date(), new Date()]
  return d3.extent(trips.value, (t) => new Date(fixDate(t.date)))
})

const stopsByTrip = computed(() => {
  const map = new Map()
  for (const s of tripStops.value) {
    if (!map.has(s.trip_id)) map.set(s.trip_id, [])
    map.get(s.trip_id).push(s)
  }
  for (const stops of map.values()) stops.sort((a, b) => a.time.localeCompare(b.time))
  return map
})

const visibleTrips = computed(() => trips.value.filter((t) => isKnownInDataset(t, filterStore.activeDataset)))

function zonesOfTrip(tripId) {
  const stops = stopsByTrip.value.get(tripId) || []
  return new Set(stops.map((s) => placeInfo.value.get(s.place_id)?.zone).filter(Boolean))
}

function draw() {
  if (!containerRef.value) return
  const svg = d3.select(containerRef.value).style('overflow', 'visible')
  svg.selectAll('*').remove()

  const rows = persons.value
  const margin = { top: 14, right: 20, bottom: 30, left: 60 }
  const rowH = 44
  const width = svgWidth.value
  const height = margin.top + margin.bottom + rows.length * rowH
  svg.attr('width', width).attr('height', height)

  const x = d3.scaleTime().domain(dateExtent.value).range([margin.left, width - margin.right])
  const y = d3.scaleBand().domain(rows.map((p) => p.id)).range([margin.top, height - margin.bottom]).padding(0.3)

  let tooltip = d3.select('body').select('.tt-tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'tt-tooltip')
      .style('position', 'fixed').style('pointer-events', 'none')
      .style('background', 'white').style('color', '#0f172a')
      .style('border', '1px solid #e2e8f0')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
      .style('padding', '10px 14px').style('border-radius', '8px')
      .style('font-size', '13px').style('max-width', '320px')
      .style('line-height', '1.5')
      .style('opacity', 0).style('z-index', 50)
  }

  // asse temporale
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b %d')))
    .call((g) => g.selectAll('text').attr('font-size', 11).attr('fill', '#94a3b8'))
    .call((g) => g.select('.domain').attr('stroke', '#e2e8f0'))

  // righe guida
  svg.selectAll('line.row-guide')
    .data(rows).join('line').attr('class', 'row-guide')
    .attr('x1', margin.left).attr('x2', width - margin.right)
    .attr('y1', (d) => y(d.id) + y.bandwidth() / 2)
    .attr('y2', (d) => y(d.id) + y.bandwidth() / 2)
    .attr('stroke', '#f1f5f9')

  const avatar = svg.selectAll('g.avatar').data(rows).join('g')
    .attr('class', 'avatar')
    .attr('transform', (d) => `translate(${margin.left - 30},${y(d.id) + y.bandwidth() / 2})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => { filterStore.selectedPerson = filterStore.selectedPerson === d.id ? null : d.id })
    .on('mouseenter', (event, d) => {

      const myTripIds = new Set(visibleTrips.value.filter((t) => t.person_id === d.id).map((t) => t.id))
      const tally = new Map()
      let total = 0
      for (const [tid, stops] of stopsByTrip.value.entries()) {
        if (!myTripIds.has(tid)) continue
        for (const s of stops) {
          const zone = placeInfo.value.get(s.place_id)?.zone
          if (!zone) continue
          tally.set(zone, (tally.get(zone) || 0) + 1)
          total += 1
        }
      }
      const rows = [...tally.entries()].sort((a, b) => b[1] - a[1])
        .map(([z, n]) => `
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
            <span style="width:9px;height:9px;border-radius:50%;background:${zoneColor(z)};display:inline-block;flex-shrink:0;"></span>
            <span style="text-transform:capitalize;">${z}</span>
            <span style="margin-left:auto;font-weight:600;padding-left:10px;">${n} (${total ? Math.round((n / total) * 100) : 0}%)</span>
          </div>`).join('')
      tooltip.style('opacity', 1).html(
        `<div style="font-weight:700;">${d.name || d.id}</div>` +
        `<div style="color:#94a3b8;font-size:11px;margin-bottom:2px;">tappe per zona</div>` +
        (rows || '<div>nessuna tappa nota</div>'),
      )
    })
    .on('mousemove', (event) => tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY + 14}px`))
    .on('mouseleave', () => tooltip.style('opacity', 0))

  avatar.append('circle')
    .attr('r', 14)
    .attr('fill', AVATAR_COLOR)
    .attr('opacity', (d) => (filterStore.selectedPerson && filterStore.selectedPerson !== d.id ? 0.35 : 1))
    .attr('stroke', (d) => (filterStore.selectedPerson === d.id ? '#0f172a' : 'none'))
    .attr('stroke-width', 2)

  avatar.append('text')
    .attr('text-anchor', 'middle').attr('dy', '0.32em')
    .attr('font-size', 11).attr('font-weight', 700).attr('fill', 'white')
    .style('pointer-events', 'none')
    .text((d) => (d.name || d.id).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase())

  const tripsData = rows.flatMap((p) => visibleTrips.value.filter((t) => t.person_id === p.id))

  function isDimmed(t) {
    if (filterStore.selectedPerson && t.person_id !== filterStore.selectedPerson) return true
    if (filterStore.selectedZone && !zonesOfTrip(t.id).has(filterStore.selectedZone)) return true
    return false
  }

  svg.selectAll('rect.trip')
    .data(tripsData, (d) => d.id)
    .join('rect')
    .attr('class', 'trip')
    .attr('x', (d) => x(new Date(fixDate(d.date))) - 1.5)
    .attr('width', 3)
    .attr('y', (d) => y(d.person_id) + y.bandwidth() / 2 - 12)
    .attr('height', 24)
    .attr('rx', 1.5)
    .attr('fill', '#b63576')
    .attr('stroke', (d) => (d.id === filterStore.selectedTrip ? '#f59e0b' : 'none'))
    .attr('stroke-width', (d) => (d.id === filterStore.selectedTrip ? 2 : 0))
    .attr('opacity', (d) => (isDimmed(d) ? 0.2 : 0.85))
    .style('cursor', 'pointer')
    .on('click', (event, d) => { filterStore.selectedTrip = filterStore.selectedTrip === d.id ? null : d.id })
    .on('mouseenter', (event, d) => {
      const stops = stopsByTrip.value.get(d.id) || []
      const stopLines = stops.map((s) => {
        const info = placeInfo.value.get(s.place_id)
        return `
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${zoneColor(info?.zone)};display:inline-block;flex-shrink:0;"></span>
            <span>${info?.name || s.place_id}</span>
            <span style="color:#94a3b8;margin-left:auto;padding-left:8px;text-transform:capitalize;">${info?.zone || 'n/d'}</span>
          </div>`
      })
      tooltip.style('opacity', 1).html(
        `<div style="font-weight:700;">${d.id}</div>` +
        `<div style="color:#64748b;font-size:12px;">${d.person_id}</div>` +
        `<div style="color:#64748b;font-size:12px;margin-bottom:4px;">${fixDate(d.date)} · ${d.start}–${d.end}</div>` +
        (stopLines.length ? stopLines.join('') : '<div>nessuna tappa nota</div>'),
      )
    })
    .on('mousemove', (event) => tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY + 14}px`))
    .on('mouseleave', () => tooltip.style('opacity', 0))
}

watch([visibleTrips, svgWidth, () => filterStore.selectedPerson, () => filterStore.selectedZone, () => filterStore.selectedTrip], () => draw())
</script>

<template>
  <div class="border border-slate-200 rounded-lg p-4">
    <h2 class="font-semibold text-lg mb-1">Trips in time</h2>
    <p class="text-sm text-slate-400 mb-3">
      Dataset: <b>{{ filterStore.activeDataset }}</b>
    </p>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <div v-else ref="wrapperRef" class="w-full">
      <svg ref="containerRef"></svg>
    </div>
  </div>
</template>