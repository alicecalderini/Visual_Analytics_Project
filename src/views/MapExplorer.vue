<script setup>
import FilterSidebar from '../components/FilterSidebar.vue'
import TripsByZone from '../components/TripsByZone.vue'
import TripTimeline from '../components/TripTimeline.vue'
import OceanusMap from '../components/OceanusMap.vue'
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