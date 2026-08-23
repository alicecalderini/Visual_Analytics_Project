import { createRouter, createWebHashHistory } from 'vue-router'

import Overview from '../views/Overview.vue'
import BiasExplorer from '../views/BiasExplorer.vue'
import Comparison from '../views/Comparison.vue'
import PersonProfile from '../views/PersonProfile.vue'

const routes = [
  { path: '/', name: 'overview', component: Overview },
  { path: '/bias-explorer', name: 'biasExplorer', component: BiasExplorer },
  { path: '/comparison', name: 'comparison', component: Comparison },
  { path: '/person-profile', name: 'personProfile', component: PersonProfile },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
