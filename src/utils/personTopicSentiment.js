export function buildPersonTopicSentiment(initiativeParticipants, initiatives) {
  const topicByInitiative = new Map(initiatives.map((i) => [i.id, i.topic_id]))
  const groups = new Map()

  for (const row of initiativeParticipants) {
    const topicId = topicByInitiative.get(row.initiative_id)
    if (!topicId) continue

    const key = `${row.entity_id}::${topicId}`
    if (!groups.has(key)) {
      groups.set(key, {
        entity_id: row.entity_id,
        entity_type: row.entity_type,
        topic_id: topicId,
        sentiment: row.sentiment,
        reason: row.reason,
        industry: row.industry || [],
        in_filah: false,
        in_trout: false,
      })
    }
    const g = groups.get(key)
    g.in_filah = g.in_filah || row.in_filah
    g.in_trout = g.in_trout || row.in_trout
  }

  return Array.from(groups.values())
}

export function isKnownInDataset(row, dataset) {
  if (dataset === 'journalist') return true
  if (dataset === 'FILAH') return row.in_filah
  if (dataset === 'TROUT') return row.in_trout
  return false
}