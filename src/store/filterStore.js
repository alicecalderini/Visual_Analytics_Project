import { reactive } from 'vue'

/**
 * Stato globale condiviso tra i widget (linked views).
 * Un widget puo' leggere/scrivere questi valori; gli altri, se li osservano
 * (watch/computed), si aggiornano di conseguenza - senza dover passare props
 * manualmente tra componenti non direttamente imparentati.
 *
 * Esempio d'uso in un widget:
 *   import { filterStore } from '../store/filterStore'
 *   filterStore.selectedPerson = 'Teddy Goldstein'   // scrive la selezione
 *   watch(() => filterStore.selectedPerson, (p) => { ... })  // un altro widget reagisce
 */
export const filterStore = reactive({
  // persona attualmente selezionata (es. cliccando un punto/barra in un widget)
  selectedPerson: null,
  // dataset attivo per il confronto: 'journalist' | 'FILAH' | 'TROUT'
  activeDataset: 'journalist',
  // topic selezionato (per drill-down da industry a topic specifico)
  selectedTopic: null,
  // intervallo di meeting selezionato (per filtri temporali)
  selectedMeetingRange: null,
})

export function resetSelection() {
  filterStore.selectedPerson = null
  filterStore.selectedTopic = null
  filterStore.selectedMeetingRange = null
}
