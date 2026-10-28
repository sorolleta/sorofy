import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// En GitHub Pages la app vive en /sorofy/; en local, en la raíz
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
