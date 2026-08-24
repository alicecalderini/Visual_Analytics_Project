import { createRouter, createWebHashHistory } from 'vue-router'

import MembersExplorer from '../views/MembersExplorer.vue'
import MapExplorer from '../views/MapExplorer.vue'
import BiasBalance from '../views/BiasBalance.vue'

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
