// Colori condivisi per le 6 categorie di "zone" presenti in places.json,
// usati coerentemente da TripsByZone, TripTimeline e OceanusMap.
export const ZONE_COLORS = {
  government: '#6164f3',
  commercial: '#e5829b',
  tourism: '#10b981',
  connector: '#f59e0b',
  residential: '#ee5b5b',
  industrial: '#78350f',
}

export const ZONE_ORDER = ['government', 'commercial', 'tourism', 'connector', 'residential', 'industrial']

export function zoneColor(zone) {
  return ZONE_COLORS[zone] || '#94a3b8'
}