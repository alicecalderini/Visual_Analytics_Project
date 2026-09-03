import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  // Cambia questo con il nome del tuo repository GitHub se pubblichi su GitHub Pages
  // (es. se il repo si chiama "cootefoo-visual-analytics", base deve essere '/cootefoo-visual-analytics/').
  // In sviluppo locale (npm run dev) questo valore non ha effetto.
  base: '/Visual_Analytics_Project/',
})
