'use strict'
// Génère les guides d'installation (PDF, une page Lettre) : FR depuis build/guide/installation.html, EN depuis installation.en.html.
// Aucune fenêtre à l'écran : fenêtre jamais montrée, icône du Dock masquée. Lancer : npm run guide.
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { fillGuide } = require('./fill.cjs')

const ROOT = path.resolve(__dirname, '../..')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const OUT_DIR = path.join(ROOT, 'release')
const GUIDES = [
  { src: 'installation.html', out: 'AV-WAN-guide-installation.pdf' },
  { src: 'installation.en.html', out: 'AV-WAN-installation-guide.pdf' }
]

app.dock?.hide()

async function renderGuide(win, { src, out }) {
  const template = fs.readFileSync(path.join(ROOT, 'build', 'guide', src), 'utf8')
  const html = fillGuide(template, {
    VERSION: pkg.version,
    RELEASES_URL: `${pkg.homepage}/releases`,
    FONT_DIR: pathToFileURL(path.join(ROOT, 'node_modules', '@fontsource')).href
  })
  const file = path.join(app.getPath('temp'), `avwan-guide-${process.pid}-${src}`)
  try {
    fs.writeFileSync(file, html)
    await win.loadFile(file)
    if (BrowserWindow.getAllWindows().some((w) => w.isVisible())) throw new Error('Une fenêtre est visible : arrêt.')
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
    const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
    fs.mkdirSync(OUT_DIR, { recursive: true })
    const target = path.join(OUT_DIR, out)
    fs.writeFileSync(target, pdf)
    console.log(`Guide écrit : ${path.relative(ROOT, target)}`)
  } finally {
    fs.rmSync(file, { force: true })
  }
}

async function main() {
  // Une seule fenêtre, jamais montrée, réutilisée pour les deux guides.
  const win = new BrowserWindow({ width: 816, height: 1056, show: false, webPreferences: { sandbox: true, contextIsolation: true } })
  try {
    for (const guide of GUIDES) await renderGuide(win, guide)
  } finally {
    win.destroy()
  }
}

app.whenReady().then(main).then(
  () => app.quit(),
  (e) => {
    console.error(e)
    app.exit(1)
  }
)
