<script setup>
import { ref, onMounted, watch } from 'vue'
import { filterStore } from '../store/filterStore'
import { getPersons } from '../utils/dataManager'

const persons = ref([])

onMounted(async () => {
  persons.value = await getPersons()
  if (!filterStore.selectedPerson && persons.value.length) {
    filterStore.selectedPerson = persons.value[0].id
  }
})
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-2">Profilo persona</h1>
    <p class="text-slate-600 mb-4">
      Task 4 — per la persona selezionata, confronto tra ciò che racconta FILAH,
      TROUT e il dataset completo (sentiment per topic, spostamenti reali sulla mappa,
      partecipazioni note/mancanti in ciascun dataset).
    </p>

    <label class="text-sm text-slate-500 mr-2">Persona:</label>
    <select
      v-model="filterStore.selectedPerson"
      class="border border-slate-300 rounded-md px-2 py-1 text-sm"
    >
      <option v-for="p in persons" :key="p.id" :value="p.id">{{ p.id }}</option>
    </select>

    <p class="text-sm text-slate-400 mt-6">
      Selezionato: <b>{{ filterStore.selectedPerson }}</b> —
      questa selezione e' gia' condivisa (store globale): un widget qui potrebbe
      reagire ad essa con un semplice <code>watch()</code>.
    </p>
  </div>
</template>
