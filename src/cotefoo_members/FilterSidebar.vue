<script setup>
import { ref, onMounted, computed } from 'vue'
import { filterStore, resetSelection } from './filterStore' 
import { getPersons } from './dataManager'

const props = defineProps({ 
  showPersonFilter: { type: Boolean, default: true },
  showFishingToggle: { type: Boolean, default: false },
  aggregateFishing: { type: Boolean, default: false },
})

const emit = defineEmits(['update:aggregateFishing']) 
const persons = ref([])

onMounted(async () => {
  persons.value = await getPersons()
})

const sortedPersons = computed(() =>
  [...persons.value].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)),
)
function selectPerson(id) {
  filterStore.selectedPerson = filterStore.selectedPerson === id ? null : id
}
</script>

<template>
  <aside class="w-56 shrink-0 border-r border-slate-200 p-4 flex flex-col gap-6 h-full overflow-y-auto">
    <div>
      <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Dataset</h3>
      <div class="flex flex-col gap-1">
        
        <button
          v-for="ds in ['journalist', 'FILAH', 'TROUT']"
          :key="ds"
          class="px-3 py-1.5 rounded-md border text-sm text-left"
          :class="filterStore.activeDataset === ds
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
          @click="filterStore.activeDataset = ds"
        >
          {{ ds }}
        </button>
      </div>
    </div>

 
    <div v-if="props.showFishingToggle">
      <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Industries</h3>
      <button
        class="w-full px-3 py-1.5 rounded-md border text-sm text-left"
        :class="aggregateFishing
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
        @click="emit('update:aggregateFishing', !aggregateFishing)"
      >
        Aggregate fishing
      </button>
    </div>

    <div v-if="props.showPersonFilter">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Person</h3>
        <button
          v-if="filterStore.selectedPerson"
          class="text-xs text-indigo-600 hover:underline"
          @click="resetSelection"
        >
         
          reset
        </button>
      </div>
      <div class="flex flex-col gap-1">
       <button
          v-for="p in sortedPersons"
          :key="p.id"
          class="px-3 py-1.5 rounded-md border text-sm text-left"
          :class="filterStore.selectedPerson === p.id
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
          @click="selectPerson(p.id)"
        >
          {{ p.name || p.id }}
        </button>
      </div>
    </div>
  </aside>
</template>