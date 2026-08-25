<script setup>
import FilterSidebar from '../components/FilterSidebar.vue'
import TopicSentimentHeatmap from '../components/TopicSentimentHeatmap.vue'
import DatasetSummary from '../components/DatasetSummary.vue'
import TopicSentimentBars from '../components/TopicSentimentBars.vue'
import TopicVoicesPanel from '../components/TopicVoicesPanel.vue'
import PersonActivityOverview from '../components/PersonActivityOverview.vue'
</script>

<template>
  <div class="flex h-full">
    <FilterSidebar />

    <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div class="flex flex-wrap gap-6 items-start">
        <TopicSentimentHeatmap />
        <DatasetSummary />
      </div>

      <div class="flex flex-wrap gap-6 items-start">
        <TopicSentimentBars />
        <TopicVoicesPanel />
      </div>

      <PersonActivityOverview />
    </div>
  </div>
</template>