<script setup>
import FilterSidebar from '../shared/FilterSidebar.vue'
import TopicSentimentHeatmap from './TopicSentimentHeatmap.vue'
import DatasetSummary from './DatasetSummary.vue'
import TopicSentimentBars from './TopicSentimentBars.vue'
import TopicVoicesPanel from './TopicVoicesPanel.vue'
import PersonActivityOverview from './PersonActivityOverview.vue'
</script>

<template>
  <div class="flex h-full">
    <FilterSidebar />
    <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,max-content)_minmax(320px,1fr)] gap-6 items-start">
        <TopicSentimentHeatmap />
        <DatasetSummary />
      </div>
      <div class="flex gap-6 items-start">
        <TopicSentimentBars />
        <TopicVoicesPanel />
      </div>
      <PersonActivityOverview />
    </div>
  </div>
</template>