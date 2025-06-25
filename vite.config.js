import { defineConfig } from 'vite'

export default defineConfig({
  base: '/warforrelios/', // Repository name from GitHub
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
}) 