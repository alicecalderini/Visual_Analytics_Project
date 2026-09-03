import { reactive } from 'vue'

export const filterStore = reactive({
  selectedPerson: null,
  activeDataset: 'journalist',
  selectedTopic: null,
  selectedMeetingRange: null,
  selectedZone: null,
  selectedTrip: null,
})