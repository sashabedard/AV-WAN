// scripts/brand/pages.cjs
'use strict'
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const FONTS = path.resolve(__dirname, '../../node_modules/@fontsource')
const font = (pkg, file) => pathToFileURL(path.join(FONTS, pkg, 'files', file)).href
const svgDataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

function fontFaces() {
  return [
    `@font-face{font-family:'Archivo Narrow';font-weight:700;src:url('${font('archivo-narrow', 'archivo-narrow-latin-700-normal.woff2')}') format('woff2')}`,
    `@font-face{font-family:'IBM Plex Mono';font-weight:600;src:url('${font('ibm-plex-mono', 'ibm-plex-mono-latin-600-normal.woff2')}') format('woff2')}`
  ].join('\n')
}

// Rastérise l'icône à n'importe quelle taille en gardant la transparence (canvas → PNG).
// Le SVG est redessiné à chaque taille : pas de réduction floue d'une grande image.
function iconPage(svg) {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><script>
const img = new Image()
const ready = new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('SVG illisible')) })
img.src = ${JSON.stringify(svgDataUri(svg))}
window.renderIcon = async (size) => {
  await ready
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(img, 0, 0, size, size)
  return c.toDataURL('image/png')
}
</script></body></html>`
}

// Logo du README : icône, mot-symbole et sous-titre, sur le fond de GitHub (sombre ou clair).
function logoPage(svg, theme) {
  const dark = theme === 'dark'
  const bg = dark ? '#0d1117' : '#ffffff'
  const ink = dark ? '#ECE7DC' : '#1E1F22'
  const muted = dark ? '#858C94' : '#6B675E'
  const accent = dark ? '#F2A93B' : '#C2410C'
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces()}
html,body{margin:0;width:1200px;height:360px;background:${bg};overflow:hidden}
.row{display:flex;align-items:center;gap:48px;height:360px;padding:0 72px;box-sizing:border-box}
img{width:216px;height:216px;flex:none}
.word{font:700 132px/1 'Archivo Narrow';letter-spacing:.09em;color:${ink}}
.dot{color:${accent}}
.sub{margin-top:18px;font:600 27px/1 'IBM Plex Mono';color:${muted}}
</style></head><body><div class="row"><img src="${svgDataUri(svg)}" alt=""><div><div class="word">AV<span class="dot">·</span>WAN</div><div class="sub">Audio-Vidéo · Wiring, Addressing, Networking</div></div></div></body></html>`
}

module.exports = { iconPage, logoPage }
