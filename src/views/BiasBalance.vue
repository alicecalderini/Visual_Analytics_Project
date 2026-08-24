<script setup>
import { ref, onMounted } from 'vue'
import { getInitiativeParticipants } from '../utils/dataManager'

const nParticipations = ref(null)

onMounted(async () => {
  const rows = await getInitiativeParticipants()
  nParticipations.value = rows.length
})
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-2">La bilancia: fishing vs tourism</h1>
    <p class="text-slate-600">Hello world 👋</p>
    <p class="text-sm text-slate-400 mt-2">
      (test caricamento dati) partecipazioni trovate in initiative_participants.json: {{ nParticipations }}
    </p>
  </div>
</template>
