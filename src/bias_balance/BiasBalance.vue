<script setup>
import { ref } from 'vue'
import FilterSidebar from '../shared/FilterSidebar.vue'
import IndustryBalance from './IndustryBalance.vue'
import InitiativesByIndustry from './InitiativesByIndustry.vue'

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
    <!--- in template si preferisce scrivere show-person-filter, in script showPersonFilter, ma è la stessa cosa-->

    <!--con v-model vue "ascolta" l'evento update e aggiorna la variabile aggregateFishing-->
    <!--aggregateFishing è una ref, quindi quando cambia vue si aggiorna x ttt qll che la usano-->
    <!--BiasBalance.vue ripassa il nuovo valore a tutti i figli(props) che ridisegnano il template-->

    <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <IndustryBalance :aggregate-fishing="aggregateFishing" />
      <InitiativesByIndustry :aggregate-fishing="aggregateFishing" />
    </div>
  </div>
</template>