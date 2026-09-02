<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { filterStore } from '../shared/filterStore'
import { getOceanusGeo, getPlaces, getTripStops } from '../shared/dataManager'
import { isKnownInDataset } from '../shared/personTopicSentiment'
import { ZONE_ORDER, zoneColor } from './zones'

const geo = ref(null)
const places = ref([])
const placeById = ref(new Map())
const tripStops = ref([])
const loading = ref(true)
const svgRef = ref(null)
const wrapperRef = ref(null)
const mapWidth = ref(1000)
const HEIGHT = 640

onMounted(async () => {
  const [g, pl, ts] = await Promise.all([getOceanusGeo(), getPlaces(), getTripStops()])
  geo.value = g
  places.value = pl
  placeById.value = new Map(pl.map((p) => [p.id, p]))
  tripStops.value = ts
  loading.value = false
  await nextTick()

  if (wrapperRef.value) {
    const measure = () => { mapWidth.value = Math.max(600, wrapperRef.value.clientWidth) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrapperRef.value)
  }
  draw()
})

const visiblePlaces = computed(() => places.value.filter((p) => (
  p.latitude && p.longitude && isKnownInDataset(p, filterStore.activeDataset)
)))

const selectedTripRoute = computed(() => {
  if (!filterStore.selectedTrip) return []
  return tripStops.value
    .filter((s) => s.trip_id === filterStore.selectedTrip)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((s) => placeById.value.get(s.place_id))
    .filter((p) => p && p.latitude && p.longitude)
})

let zoomBehavior = null

function draw() {
  if (!svgRef.value || !geo.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  const WIDTH = mapWidth.value
  svg.attr('width', WIDTH).attr('height', HEIGHT)

  const projection = d3.geoIdentity().reflectY(true).fitExtent([[20, 20], [WIDTH - 20, HEIGHT - 20]], geo.value)
  const path = d3.geoPath(projection)

  const zoomG = svg.append('g').attr('class', 'zoom-layer')

  let tooltip = d3.select('body').select('.map-tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'map-tooltip')
      .style('position', 'fixed').style('pointer-events', 'none')
      .style('background', 'white').style('color', '#0f172a')
      .style('border', '1px solid #e2e8f0')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
      .style('padding', '10px 14px').style('border-radius', '8px')
      .style('font-size', '13px').style('line-height', '1.5')
      .style('max-width', '280px')
      .style('opacity', 0).style('z-index', 50)
  }

  function showIslandTooltip(event, d) {
    const p = d.properties
    tooltip.style('opacity', 1).html(
      `<div style="font-weight:700;color:#4338ca;">${p.Name}</div>` +
      `<div style="margin-top:2px;">Kind: ${p.Kind || 'n/d'}</div>` +
      (p.Description ? `<div style="color:#64748b;margin-top:2px;">${p.Description}</div>` : '') +
      (p.Activities?.length ? `<div style="margin-top:2px;">Activities: ${p.Activities.join(', ')}</div>` : ''),
    )
  }
  function showPlaceTooltip(event, d) {
    const label = d.name || (d.city_name ? `Luogo senza nome a ${d.city_name}` : 'Luogo senza nome')
    tooltip.style('opacity', 1).html(
      `<div style="display:flex;align-items:center;gap:6px;font-weight:700;">` +
      `<span style="width:9px;height:9px;border-radius:50%;background:${zoneColor(d.zone)};display:inline-block;"></span>` +
      `${label}</div>` +
      `<div style="color:#64748b;margin-top:2px;">${d.city_name || ''}</div>` +
      `<div style="text-transform:capitalize;margin-top:2px;">${d.zone || 'zona n/d'}` +
      (d.zone_detail ? ` · ${d.zone_detail}` : '') + `</div>`,
    )
  }
  function moveTooltip(event) {
    tooltip.style('left', `${event.clientX + 14}px`).style('top', `${event.clientY + 14}px`)
  }
  function hideTooltip() { tooltip.style('opacity', 0) }

  const ISLAND_PALETTE = ['#bfdbfe', '#ddd6fe', '#bbf7d0', '#a5f3fc']
  const ISLAND_STROKE = ['#93c5fd', '#c4b5fd', '#86efac', '#67e8f9']
  const polygons = geo.value.features.filter((f) => f.geometry.type === 'Polygon')
  const islandFill = d3.scaleOrdinal().domain(polygons.map((p) => p.properties.Name)).range(ISLAND_PALETTE)
  const islandStroke = d3.scaleOrdinal().domain(polygons.map((p) => p.properties.Name)).range(ISLAND_STROKE)

  zoomG.selectAll('path.island')
    .data(polygons).join('path')
    .attr('class', 'island')
    .attr('d', path)
    .attr('fill', (d) => islandFill(d.properties.Name))
    .attr('fill-opacity', 0.35)
    .attr('stroke', (d) => islandStroke(d.properties.Name))
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event, d) {
      d3.select(this).attr('fill-opacity', 0.6).attr('stroke-width', 1.8)
      showIslandTooltip(event, d)
    })
    .on('mousemove', moveTooltip)
    .on('mouseleave', function () {
      d3.select(this).attr('fill-opacity', 0.35).attr('stroke-width', 1)
      hideTooltip()
    })
    
  const cities = geo.value.features.filter((f) => f.properties?.type === 'Entity.Location.City')
  zoomG.selectAll('circle.city-dot')
    .data(cities).join('circle')
    .attr('class', 'city-dot')
    .attr('cx', (d) => projection(d.geometry.coordinates)[0])
    .attr('cy', (d) => projection(d.geometry.coordinates)[1])
    .attr('r', 3.5).attr('fill', '#334155')
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => {
      tooltip.style('opacity', 1).html(`<div style="font-weight:700;">${d.properties.Name}</div><div style="color:#64748b;">città</div>`)
    })
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip)

  zoomG.selectAll('circle.place')
    .data(visiblePlaces.value, (d) => d.id).join('circle')
    .attr('class', 'place')
    .attr('cx', (d) => projection([d.longitude, d.latitude])[0])
    .attr('cy', (d) => projection([d.longitude, d.latitude])[1])
    .attr('r', 5.5)
    .attr('fill', (d) => zoneColor(d.zone))
    .attr('fill-opacity', 0.85)
    .attr('stroke', 'white').attr('stroke-width', 1.2)
    .style('cursor', 'pointer')
    .on('mouseenter', showPlaceTooltip)
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip)

  const route = selectedTripRoute.value
  if (route.length > 1) {
    const line = d3.line()
      .x((d) => projection([d.longitude, d.latitude])[0])
      .y((d) => projection([d.longitude, d.latitude])[1])
    zoomG.append('path')
      .attr('d', line(route))
      .attr('fill', 'none').attr('stroke', '#0f172a').attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,4')
  }
  if (route.length) {
    zoomG.selectAll('circle.route-stop')
      .data(route).join('circle')
      .attr('class', 'route-stop')
      .attr('cx', (d) => projection([d.longitude, d.latitude])[0])
      .attr('cy', (d) => projection([d.longitude, d.latitude])[1])
      .attr('r', 8)
      .attr('fill', 'none').attr('stroke', '#0f172a').attr('stroke-width', 2)
  }

  zoomBehavior = d3.zoom().scaleExtent([1, 10]).on('zoom', (event) => {
    zoomG.attr('transform', event.transform)
  })
  svg.call(zoomBehavior)
}

function resetZoom() {
  if (!svgRef.value || !zoomBehavior) return
  d3.select(svgRef.value).transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity)
}

watch([visiblePlaces, selectedTripRoute, mapWidth], () => draw())
</script>

<template>
  <div class="border border-slate-200 rounded-lg shadow-sm p-4">
    <div class="flex items-center justify-between mb-1">
      <h2 class="font-semibold text-lg">Map</h2>
      <div class="flex items-center gap-4">
        <span v-if="filterStore.selectedTrip" class="text-sm text-slate-500">
          percorso: <b>{{ filterStore.selectedTrip }}</b>
          <button class="text-[#185ead] hover:underline ml-1" @click="filterStore.selectedTrip = null">✕</button>
        </span>

          <button class="text-sm text-[#185ead] hover:underline" @click="resetZoom">reimposta zoom</button>
      </div>
    </div>
    <p class="text-sm text-slate-400 mb-3">
      Dataset: <b>{{ filterStore.activeDataset }}</b> 
    </p>

    <div class="flex flex-wrap gap-3 mb-3 text-sm">
      <span v-for="z in ZONE_ORDER" :key="z" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full inline-block" :style="{ backgroundColor: zoneColor(z) }"></span>
        <span class="capitalize text-slate-600">{{ z }}</span>
      </span>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <div v-else ref="wrapperRef" class="w-full">
      <svg ref="svgRef" class="border border-slate-100 rounded-lg w-full"></svg>
    </div>
  </div>
</template>