<script setup>

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { getInitiativeParticipants, getInitiatives, getPersons, getOrganizations } from '../shared/dataManager'
import { filterStore } from '../shared/filterStore'
import { buildPersonTopicSentiment, isKnownInDataset, readableLabel } from '../shared/personTopicSentiment'

const loading = ref(true)
const rows = ref([])
const persons = ref([])
const organizations = ref([])

const viewMode = ref('topic') // 'topic' | 'industry'
const entityTypeFilter = ref('both')
const ALL_INDUSTRIES = ['small vessel', 'large vessel', 'tourism', 'unclassified']
const selectedIndustries = ref(new Set(ALL_INDUSTRIES))

const containerRef = ref(null)
let suppressHoverUntil = 0
const BASE_TOP = 40
const BASE_RIGHT = 10
const BASE_LEFT = 20
const SPLIT_THRESHOLD = 7
const TOPIC_CELL_W = 30.5
const INDUSTRY_CELL_W = 88
const SPLIT_GAP_BASE = 40
const ROW_H = 26 
const TOPIC_ROW_H = 28.5 


onMounted(async () => {
  const [participants, initiatives, p, o] = await Promise.all([
    getInitiativeParticipants(), getInitiatives(), getPersons(), getOrganizations(),
  ])
  rows.value = buildPersonTopicSentiment(participants, initiatives)
  persons.value = p
  organizations.value = o
  loading.value = false
  await nextTick()
  draw()
})

function industryOf(row) {
  return row.industry && row.industry.length ? row.industry : ['unclassified']
}

function nodePresent(entity, dataset) {
  if (dataset === 'journalist') return true
  return dataset === 'FILAH' ? entity.in_filah : entity.in_trout
}

const rowIds = computed(() => {
  const dataset = filterStore.activeDataset
  const ids = []
  if (entityTypeFilter.value !== 'organization') {
    for (const p of persons.value) if (nodePresent(p, dataset)) ids.push(p.id)
  }
  if (entityTypeFilter.value !== 'person') {
    for (const o of organizations.value) if (nodePresent(o, dataset)) ids.push(o.id)
  }
  return ids.sort()
})

const filteredTopicIds = computed(() => {
  const ids = new Set()
  for (const row of rows.value) {
    if (industryOf(row).some((i) => selectedIndustries.value.has(i))) ids.add(row.topic_id)
  }
  return ids
})

const topicCells = computed(() => {
  const dataset = filterStore.activeDataset
  const rowSet = new Set(rowIds.value)
  return rows.value
    .filter((row) => {
      if (!rowSet.has(row.entity_id)) return false
      if (!filteredTopicIds.value.has(row.topic_id)) return false
      if (!isKnownInDataset(row, dataset)) return false
      return true
    })
    .map((row) => ({
      entityId: row.entity_id,
      colId: row.topic_id,
      sentiment: row.sentiment,
      reason: row.reason,
      isNull: row.sentiment === null || row.sentiment === undefined,
    }))
})
const topicColIds = computed(() => Array.from(new Set(topicCells.value.map((c) => c.colId))).sort())

const INDUSTRY_COLS = ['small vessel', 'large vessel', 'tourism']
const industryCells = computed(() => {
  const dataset = filterStore.activeDataset
  const rowSet = new Set(rowIds.value)
  const groups = new Map()
  const nullGroups = new Map()
  for (const row of rows.value) {
    if (!rowSet.has(row.entity_id)) continue
    if (!isKnownInDataset(row, dataset)) continue
    for (const ind of industryOf(row)) {
      if (!INDUSTRY_COLS.includes(ind)) continue
      const key = `${row.entity_id}|${ind}`
      if (row.sentiment === null || row.sentiment === undefined) {
        if (!nullGroups.has(key)) nullGroups.set(key, 0)
        nullGroups.set(key, nullGroups.get(key) + 1)
      } else {
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(row.sentiment)
      }
    }
  }
  const out = Array.from(groups.entries()).map(([key, values]) => {
    const [entityId, colId] = key.split('|')
    return { entityId, colId, sentiment: d3.mean(values), reason: `media su ${values.length} topic`, isNull: false }
  })
  for (const [key, count] of nullGroups.entries()) {
    if (groups.has(key)) continue
    const [entityId, colId] = key.split('|')
    out.push({ entityId, colId, sentiment: null, reason: `${count} topic con dato mancante`, isNull: true })
  }
  return out
})

const cells = computed(() => (viewMode.value === 'topic' ? topicCells.value : industryCells.value))
const colIds = computed(() => (viewMode.value === 'topic' ? topicColIds.value : INDUSTRY_COLS))

function toggleIndustry(ind) {
  const s = new Set(selectedIndustries.value)
  if (s.has(ind)) s.delete(ind); else s.add(ind)
  selectedIndustries.value = s
}

function selectEntity(id) {
  filterStore.selectedPerson = filterStore.selectedPerson === id ? null : id
}

let isDrawing = false
let redrawPending = false

function draw() {
  if (isDrawing) { redrawPending = true; return }
  isDrawing = true
  runDraw().finally(() => {
    isDrawing = false
    if (redrawPending) {
      redrawPending = false
      draw()
    }
  })
}

async function runDraw() {
  if (!containerRef.value) return
  suppressHoverUntil = Date.now() + 80
  const rowsD = rowIds.value
  const cols = colIds.value
  const svg = d3.select(containerRef.value).style('overflow', 'visible')

  let tooltip = d3.select('body').select('.tsh-tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'tsh-tooltip')
      .style('position', 'fixed').style('pointer-events', 'none')
      .style('background', 'white').style('color', '#0f172a')
      .style('border', '1px solid #e2e8f0')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
      .style('padding', '6px 10px').style('border-radius', '6px')
      .style('font-size', '12px').style('max-width', '260px')
      .style('opacity', 0).style('z-index', 50)
  }

  let topPad = BASE_TOP
  let rightPad = BASE_RIGHT
  let leftPad = BASE_LEFT
  let gapPad = SPLIT_GAP_BASE

  function drawBlock(m, blockRows, xRange, rowLabelX, colFontSize, colRotate, rowH = ROW_H, rowFontSize = '12px') {
    const x = d3.scaleBand().domain(cols).range(xRange).padding(0.1)
    const y = d3.scaleBand().domain(blockRows).range([m.top, m.top + blockRows.length * rowH]).padding(0.08)
    const color = d3.scaleSequential(d3.interpolateRdYlGn).domain([-1, 1])

      svg.selectAll(null).data(cols).enter().append('text')
      .attr('class', (d) => (colRotate ? 'col-label col-label-topic' : 'col-label'))
      .attr('text-anchor', colRotate ? 'start' : 'middle')
      .style('font-size', colFontSize).style('cursor', colRotate ? 'pointer' : 'default')
      .on('mouseenter', function (event, d) {
        if (colRotate && Date.now() > suppressHoverUntil) d3.select(this).style('fill', '#6d48b5')
      })
      .on('mouseleave', function (event, d) {
        if (colRotate) d3.select(this).style('fill', filterStore.selectedTopic === d ? '#6d48b5' : '#334155')
      })
      .on('click', (event, d) => { if (colRotate) filterStore.selectedTopic = filterStore.selectedTopic === d ? null : d })
      .attr('transform', (d) => (colRotate
        ? `translate(${x(d) + x.bandwidth() / 2},${m.top - 8}) rotate(-55)`
        : `translate(${x(d) + x.bandwidth() / 2},${m.top - 12})`))
      .style('fill', (d) => (colRotate && filterStore.selectedTopic === d ? '#6d48b5' : '#334155'))
      .style('font-weight', (d) => (colRotate && filterStore.selectedTopic === d ? 700 : 400))
      .text((d) => readableLabel(d))

    svg.selectAll(null).data(blockRows).enter().append('text')
    .attr('class', 'row-label')
    .attr('text-anchor', 'end')
    .attr('x', rowLabelX)
    .attr('y', (d) => y(d) + y.bandwidth() / 2)
    .attr('dy', '0.32em')
    .style('font-size', rowFontSize).style('cursor', 'pointer')
    .style('fill', (d) => (filterStore.selectedPerson === d ? '#185ead' : '#334155'))
    .style('font-weight', (d) => (filterStore.selectedPerson === d ? 700 : 400))
    .on('mouseenter', function (event, d) {
      if (Date.now() > suppressHoverUntil && filterStore.selectedPerson !== d) d3.select(this).style('fill', '#185ead')
    })
    .on('mouseleave', function (event, d) {
      d3.select(this).style('fill', filterStore.selectedPerson === d ? '#185ead' : '#334155')
    })
    .on('click', (event, d) => selectEntity(d))
    .text((d) => d)

    const blockCells = cells.value.filter((c) => blockRows.includes(c.entityId))
    svg.selectAll(null).data(blockCells).enter().append('rect')
      .attr('class', 'cell')
      .attr('x', (d) => x(d.colId))
      .attr('y', (d) => y(d.entityId))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .style('fill', (d) => (d.isNull ? '#e2e8f0' : color(d.sentiment)))
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        const sentimentText = d.isNull ? 'not available (participation confirmed, sentiment not recorded)' : d.sentiment.toFixed(2)
        tooltip.style('opacity', 1).html(
          `<b>${d.entityId}</b><br/>${readableLabel(d.colId)}<br/>sentiment: ${sentimentText}` +
          (d.reason ? `<br/><i>${d.reason}</i>` : ''),
        )
      })
      .on('mousemove', (event) => tooltip.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY + 12}px`))
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (event, d) => selectEntity(d.entityId))
  }

  function render() {
    svg.selectAll('*').remove()
    const m = { top: topPad, right: rightPad, bottom: 10, left: leftPad }

    if (viewMode.value === 'industry' && rowsD.length > SPLIT_THRESHOLD) {
      const half = Math.ceil(rowsD.length / 2)
      const groupA = rowsD.slice(0, half)
      const groupB = rowsD.slice(half)
      const gridW = cols.length * INDUSTRY_CELL_W
      const groupBOffset = m.left + gridW + gapPad

      const width = groupBOffset + gridW + m.right
      const height = m.top + half * ROW_H + m.bottom
      svg.attr('width', width).attr('height', height)

      drawBlock(m, groupA, [m.left, m.left + gridW], m.left - 10, '10px', false)
      drawBlock(m, groupB, [groupBOffset, groupBOffset + gridW], groupBOffset - 10, '10px', false)

      return { mode: 'split', m, gridW, groupA, groupB }
    }
    if (viewMode.value === 'industry') {
      const gridW = cols.length * INDUSTRY_CELL_W
      const width = m.left + gridW + m.right
      const height = m.top + rowsD.length * ROW_H + m.bottom
      svg.attr('width', width).attr('height', height)

      drawBlock(m, rowsD, [m.left, m.left + gridW], m.left - 10, '10px', false)
      return { mode: 'single-industry', m, primaryRows: rowsD }
    }
    const totalTopics = new Set(rows.value.map((r) => r.topic_id)).size || cols.length
    const scale = Math.min(3, Math.max(1, totalTopics / Math.max(1, cols.length)))
    const cellW = TOPIC_CELL_W * scale

    const width = m.left + cols.length * cellW + m.right
    const height = m.top + rowsD.length * TOPIC_ROW_H + m.bottom
    svg.attr('width', width).attr('height', height)

    drawBlock(m, rowsD, [m.left, m.left + cols.length * cellW], m.left - 10, '12px', true, TOPIC_ROW_H, '13px')
    return { mode: 'topic', m, primaryRows: rowsD }
  }

  function measureAndCorrect(state) {
    const svgEl = containerRef.value
    if (!svgEl) return false
    const svgRect = svgEl.getBoundingClientRect()
    let changed = false

    const primaryRows = state.mode === 'split' ? state.groupA : state.primaryRows
    let minLeft = Infinity
    svg.selectAll('text.row-label').each(function (d) {
      if (!primaryRows.includes(d)) return
      const r = this.getBoundingClientRect()
      if (r.left < minLeft) minLeft = r.left
    })
    if (minLeft !== Infinity) {
      const overshoot = svgRect.left - minLeft
      const slack = minLeft - svgRect.left
      if (overshoot > 2) {
        leftPad = leftPad + Math.ceil(overshoot) + 10
        changed = true
      } else if (slack > 15) {
        const next = Math.max(BASE_LEFT, leftPad - Math.floor(slack) + 10)
        if (next !== leftPad) { leftPad = next; changed = true }
      }
    }

    if (state.mode === 'split') {
      const groupAGridRightPx = svgRect.left + (state.m.left + state.gridW)
      let minLeftOfGroupB = Infinity
      svg.selectAll('text.row-label').each(function (d) {
        if (!state.groupB.includes(d)) return
        const r = this.getBoundingClientRect()
        if (r.left < minLeftOfGroupB) minLeftOfGroupB = r.left
      })
      if (minLeftOfGroupB !== Infinity) {
        const overlap = groupAGridRightPx - minLeftOfGroupB + 12
        const slack = -overlap
        if (overlap > 2) {
          gapPad = gapPad + Math.ceil(overlap)
          changed = true
        } else if (slack > 15) {
          const next = Math.max(SPLIT_GAP_BASE, gapPad - Math.floor(slack) + 10)
          if (next !== gapPad) { gapPad = next; changed = true }
        }
      }
    }

    if (state.mode === 'topic') {
      let minTop = svgRect.top
      let maxRight = svgRect.right
      svg.selectAll('text.col-label').each(function () {
        const r = this.getBoundingClientRect()
        if (r.top < minTop) minTop = r.top
        if (r.right > maxRight) maxRight = r.right
      })
      const topOverflow = svgRect.top - minTop
      if (topOverflow > 2) { topPad = topPad + Math.ceil(topOverflow) + 6; changed = true }

      const rightOverflow = maxRight - svgRect.right
      if (rightOverflow > 2) { rightPad = rightPad + Math.ceil(rightOverflow) + 6; changed = true }
    }

    return changed
  }

  for (let pass = 0; pass < 2; pass++) {
    const state = render()
    await nextTick()
    const corrected = measureAndCorrect(state)
    if (!corrected) break
  }
}

watch([viewMode, entityTypeFilter, selectedIndustries, () => filterStore.activeDataset], () => draw())
watch(() => filterStore.selectedPerson, () => draw())
watch(() => filterStore.selectedTopic, (topic) => {
  if (!containerRef.value) return
  d3.select(containerRef.value).selectAll('text.col-label-topic')
    .style('fill', function (d) { return topic === d ? '#6d48b5' : '#334155' })
    .style('font-weight', function (d) { return topic === d ? 700 : 400 })
})
</script>

<template>
  <div
  class="border border-slate-200 rounded-lg py-4"
  :class="viewMode === 'topic' ? 'px-10' : 'px-4'"
>
    <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
      <h2 class="text-lg font-semibold">Sentiment by person/organization</h2>
      <div class="inline-flex rounded-lg border border-slate-300 overflow-hidden text-sm shrink-0">
        <button
          v-for="opt in [['topic','By topic'],['industry','By industry']]" :key="opt[0]"
          class="px-3 py-1"
          :class="viewMode === opt[0] ? 'bg-[#6d48b5] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'"
          @click="viewMode = opt[0]"
        >{{ opt[1] }}</button>
      </div>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm">Loading...</div>
    <div v-else class="inline-block max-w-full overflow-auto">
      <svg ref="containerRef"></svg>
    </div>

    <div class="flex flex-col gap-3 mt-5 pt-4 border-t border-slate-100">
      <div class="flex items-center gap-3 text-sm">
        <span class="text-slate-500 w-24 shrink-0">Show</span>
        <div class="flex gap-1">
          <button
            v-for="opt in [['both','Both'],['person','People'],['organization','Organizations']]" :key="opt[0]"
            class="px-2.5 py-1 rounded-md border"
            :class="entityTypeFilter === opt[0] ? 'bg-slate-200 text-slate-900 border-slate-300 font-medium' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'"
            @click="entityTypeFilter = opt[0]"
          >{{ opt[1] }}</button>
        </div>
      </div>

      <div v-if="viewMode === 'topic'" class="flex items-center gap-3 text-sm">
        <span class="text-slate-500 w-24 shrink-0">Filter topic</span>
        <div class="flex items-center gap-1 flex-wrap">
          <button
            v-for="ind in ALL_INDUSTRIES" :key="ind"
            class="px-2.5 py-1 rounded-full border text-xs"
            :class="selectedIndustries.has(ind) ? 'bg-[#6d48b5] text-white border-[#6d48b5]' : 'bg-white border-slate-300 hover:bg-slate-50'"
            @click="toggleIndustry(ind)"
          >{{ ind }}</button>
        </div>
      </div>
    </div>
  </div>
</template>