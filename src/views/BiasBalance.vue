<script setup>
import FilterSidebar from '../components/FilterSidebar.vue'
import IndustryBalance from '../components/IndustryBalance.vue'
import InitiativesByIndustry from '../components/InitiativesByIndustry.vue'
</script>

<template>
  <div class="flex h-full">
    <FilterSidebar />

    <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <IndustryBalance />
      <InitiativesByIndustry />
    </div>
  </div>
</template>