import { createRouter, createWebHashHistory } from 'vue-router'

import MembersExplorer from '../cotefoo_members/MembersExplorer.vue'
import MapExplorer from '../map_movements/MapExplorer.vue'
import BiasBalance from '../bias_balance/BiasBalance.vue'

const routes = [
  { path: '/', name: 'membersExplorer', component: MembersExplorer },
  { path: '/map', name: 'mapExplorer', component: MapExplorer },
  { path: '/balance', name: 'biasBalance', component: BiasBalance },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
