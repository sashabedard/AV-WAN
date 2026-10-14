import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"

// La CSP n'est injectée qu'au build : en dev, le préambule de React Refresh est un script en ligne.
const cspInBuild: Plugin = {
  name: 'avwan-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: { plugins: [react(), cspInBuild] }
})
