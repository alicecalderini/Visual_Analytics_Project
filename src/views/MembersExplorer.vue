<script setup>
import { ref, onMounted } from 'vue'
import { getPersons } from '../utils/dataManager'

const nPersons = ref(null)

onMounted(async () => {
  const persons = await getPersons()
  nPersons.value = persons.length
})
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-2">Membri COOTEFOO</h1>
    <p class="text-slate-600">Hello world 👋</p>
    <p class="text-sm text-slate-400 mt-2">
      (test caricamento dati) persone trovate in persons.json: {{ nPersons }}
    </p>
  </div>
</template>
