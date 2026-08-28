<script setup>
import { ref } from 'vue'
import FilterSidebar from '../components/FilterSidebar.vue'
import IndustryBalance from '../components/IndustryBalance.vue'
import InitiativesByIndustry from '../components/InitiativesByIndustry.vue'

// stato condiviso tra sidebar e i due widget
const aggregateFishing = ref(false)
</script>

<template>
  <div class="flex h-full">
    <FilterSidebar
      :show-person-filter="false"
      :show-fishing-toggle="true"
      v-model:aggregate-fishing="aggregateFishing"
    />

    <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <IndustryBalance :aggregate-fishing="aggregateFishing" />
      <InitiativesByIndustry :aggregate-fishing="aggregateFishing" />
    </div>
  </div>
</template>