export const ZONE_COLORS = {
  government: '#61bdf3',
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