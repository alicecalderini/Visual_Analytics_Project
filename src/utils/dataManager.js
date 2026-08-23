import * as d3 from 'd3'

const BASE_URL = import.meta.env.BASE_URL

// Cache in memoria: ogni file viene scaricato una sola volta per sessione,
// anche se piu' widget lo richiedono in momenti diversi.
const cache = {}

function makeLoader(fileName) {
  return async function () {
    if (cache[fileName]) return cache[fileName]
    cache[fileName] = await d3.json(`${BASE_URL}data/${fileName}`)
    return cache[fileName]
  }
}

// --- Tabelle anagrafiche ---
export const getPersons = makeLoader('persons.json')
export const getOrganizations = makeLoader('organizations.json')
export const getPlaces = makeLoader('places.json')
export const getTopics = makeLoader('topics.json')
export const getMeetings = makeLoader('meetings.json')

// --- Spostamenti ---
export const getTrips = makeLoader('trips.json')
export const getTripStops = makeLoader('trip_stops.json')

// --- Iniziative (Discussion + Plan uniti) ---
export const getInitiatives = makeLoader('initiatives.json')
export const getInitiativeStatusTimeline = makeLoader('initiative_status_timeline.json')
export const getInitiativeParticipants = makeLoader('initiative_participants.json')

// --- File geografici ---
export const getOceanusGeo = makeLoader('raw_data/oceanus_map.geojson')  // era: makeLoader('oceanus_map.geojson')
export const getRoadMap = makeLoader('raw_data/road_map.json')            // era: makeLoader('road_map.json')

/**
 * Carica in parallelo tutte le tabelle passate (per array di nomi logici) invece di
 * una alla volta - utile nella onMounted() di una vista che ne usa molte insieme.
 * Esempio: const { persons, initiatives } = await loadAll(['persons', 'initiatives'])
 */
const LOADERS = {
  persons: getPersons,
  organizations: getOrganizations,
  places: getPlaces,
  topics: getTopics,
  meetings: getMeetings,
  trips: getTrips,
  tripStops: getTripStops,
  initiatives: getInitiatives,
  initiativeStatusTimeline: getInitiativeStatusTimeline,
  initiativeParticipants: getInitiativeParticipants,
  oceanusGeo: getOceanusGeo,
  roadMap: getRoadMap,
}

export async function loadAll(names) {
  const entries = await Promise.all(
    names.map(async (name) => [name, await LOADERS[name]()])
  )
  return Object.fromEntries(entries)
}

// Percorso corretto per eventuali asset statici (icone, immagini) rispettando il 'base' di Vite
export function getAssetPath(relativePath) {
  return `${BASE_URL}assets/${relativePath}`
}
