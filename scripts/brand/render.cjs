// scripts/brand/render.cjs
'use strict'
// Génère l'identité : icône d'app (PNG, ICNS, ICO), tuiles du Microsoft Store et logos du README, depuis build/icon.svg.
// Aucune fenêtre à l'écran : fenêtres hors écran (offscreen) et icône du Dock masquée.
// Lancer : npm run brand (macOS pour l'ICNS, qui demande iconutil).
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { iconPage, logoPage } = require('./pages.cjs')
const { packIco } = require('./ico.cjs')

const ROOT = path.resolve(__dirname, '../..')
const BUILD = path.join(ROOT, 'build')
const ASSETS = path.join(ROOT, '.github', 'assets')
const ICONSET = [
  [16, 'icon_16x16'], [32, 'icon_16x16@2x'], [32, 'icon_32x32'], [64, 'icon_32x32@2x'],
  [128, 'icon_128x128'], [256, 'icon_128x128@2x'], [256, 'icon_256x256'], [512, 'icon_256x256@2x'],
  [512, 'icon_512x512'], [1024, 'icon_512x512@2x']
]
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
// Tuiles du paquet Microsoft Store, lues par electron-builder dans build/appx : [fichier, icône, largeur, hauteur].
const APPX_TILES = [
  ['StoreLogo.png', 50, 50, 50], ['Square44x44Logo.png', 44, 44, 44],
  ['Square150x150Logo.png', 150, 150, 150], ['Wide310x150Logo.png', 150, 310, 150]
]

app.dock?.hide()

// Une seule fenêtre hors écran pour tout le script : chaque page y est chargée à son tour.
let shared = null
function offscreenWindow(width, height) {
  if (!shared || shared.isDestroyed()) {
    shared = new BrowserWindow({ width, height, show: false, frame: false, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true } })
  }
  shared.setContentSize(width, height)
  return shared
}

async function withPage(html, width, height, fn) {
  const win = offscreenWindow(width, height)
  const file = path.join(app.getPath('temp'), `avwan-brand-${process.pid}-${Date.now()}.html`)
  try {
    if (BrowserWindow.getAllWindows().some((w) => w.isVisible())) throw new Error('Une fenêtre est visible : arrêt.')
    fs.writeFileSync(file, html)
    await win.loadFile(file)
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))')
    return await fn(win)
  } finally {
    fs.rmSync(file, { force: true })
  }
}

const pngFromDataUrl = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')

async function main() {
  const svg = fs.readFileSync(path.join(BUILD, 'icon.svg'), 'utf8')
  const sizes = [...new Set([...ICONSET.map(([s]) => s), ...ICO_SIZES])]
  const pngs = new Map()
  const appx = path.join(BUILD, 'appx')
  fs.mkdirSync(appx, { recursive: true })
  await withPage(iconPage(svg), 64, 64, async (win) => {
    for (const size of sizes) pngs.set(size, pngFromDataUrl(await win.webContents.executeJavaScript(`renderIcon(${size})`)))
    for (const [name, size, width, height] of APPX_TILES) {
      fs.writeFileSync(path.join(appx, name), pngFromDataUrl(await win.webContents.executeJavaScript(`renderIcon(${size}, ${width}, ${height})`)))
    }
  })
  fs.writeFileSync(path.join(BUILD, 'icon.png'), pngs.get(1024))
  fs.writeFileSync(path.join(ASSETS, 'icone-app.png'), pngs.get(512))
  fs.writeFileSync(path.join(BUILD, 'icon.ico'), packIco(ICO_SIZES.map((size) => ({ size, png: pngs.get(size) }))))
  if (process.platform === 'darwin') {
    const dir = path.join(BUILD, 'icon.iconset')
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir)
    for (const [size, name] of ICONSET) fs.writeFileSync(path.join(dir, `${name}.png`), pngs.get(size))
    execFileSync('iconutil', ['-c', 'icns', dir, '-o', path.join(BUILD, 'icon.icns')])
    fs.rmSync(dir, { recursive: true, force: true })
  } else {
    console.warn('icon.icns non régénéré : iconutil n’existe que sur macOS.')
  }
  for (const [theme, name] of [['dark', 'logo-sombre'], ['light', 'logo-clair']]) {
    await withPage(logoPage(svg, theme), 1200, 360, async (win) => {
      const image = await win.webContents.capturePage()
      if (image.isEmpty()) throw new Error(`Capture vide : ${name}`)
      const out = image.getSize().width === 1200 ? image : image.resize({ width: 1200, height: 360, quality: 'best' })
      fs.writeFileSync(path.join(ASSETS, `${name}.png`), out.toPNG())
    })
  }
  shared?.destroy()
  console.log(`Identité générée : icône ${sizes.sort((a, b) => a - b).join(', ')} px, ICO, ICNS, tuiles du Store, logos.`)
}

app.whenReady().then(main).then(
  () => app.quit(),
  (e) => {
    console.error(e)
    app.exit(1)
  }
)
