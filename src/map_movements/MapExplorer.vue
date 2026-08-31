<script setup>
import FilterSidebar from '../shared/FilterSidebar.vue'
import TripsByZone from './TripsByZone.vue'
import TripTimeline from './TripTimeline.vue'
import OceanusMap from './OceanusMap.vue'
</script>

<template>
  <div class="flex h-full">
    <FilterSidebar />

    <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <TripsByZone />
      <TripTimeline />
      <OceanusMap />
    </div>
  </div>
</template>