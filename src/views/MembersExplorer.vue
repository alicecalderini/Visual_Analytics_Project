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
      <!-- riga 1: GRID a due colonne pensate diversamente:
           - colonna heatmap: minmax(0, max-content) - si dimensiona sul proprio
             CONTENUTO reale (largo in "per industria", piu' stretto in "per
             topic" con poche colonne filtrate), ma puo' comunque restringersi
             fino a 0 con scroll interno se lo schermo e' troppo stretto
           - colonna DatasetSummary: minmax(320px, 1fr) - non scende mai sotto
             320px, ma CRESCE per riempire tutto lo spazio che la heatmap non usa
           Risultato: quando la heatmap e' piu' stretta (vista "per topic"),
           DatasetSummary si allarga automaticamente per occupare lo spazio
           libero, invece di lasciarlo vuoto. -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,max-content)_minmax(320px,1fr)] gap-6 items-start">
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