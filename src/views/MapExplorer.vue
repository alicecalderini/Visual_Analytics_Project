<script setup>
import { ref, onMounted } from 'vue'
import { getTrips } from '../utils/dataManager'

const nTrips = ref(null)

onMounted(async () => {
  const trips = await getTrips()
  nTrips.value = trips.length
})
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-2">Mappa e spostamenti</h1>
    <p class="text-slate-600">Hello world 👋</p>
    <p class="text-sm text-slate-400 mt-2">
      (test caricamento dati) trip trovati in trips.json: {{ nTrips }}
    </p>
  </div>
</template>
