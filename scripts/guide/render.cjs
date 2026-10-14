'use strict'
// Génère le guide d'installation (PDF, une page Lettre) depuis build/guide/installation.html.
// Aucune fenêtre à l'écran : fenêtre jamais montrée, icône du Dock masquée. Lancer : npm run guide.
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { fillGuide } = require('./fill.cjs')

const ROOT = path.resolve(__dirname, '../..')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const OUT_DIR = path.join(ROOT, 'release')
const OUT = path.join(OUT_DIR, 'AV-WAN-guide-installation.pdf')

app.dock?.hide()

async function main() {
  const template = fs.readFileSync(path.join(ROOT, 'build', 'guide', 'installation.html'), 'utf8')
  const html = fillGuide(template, {
    VERSION: pkg.version,
    RELEASES_URL: `${pkg.homepage}/releases`,
    FONT_DIR: pathToFileURL(path.join(ROOT, 'node_modules', '@fontsource')).href
  })
  const file = path.join(app.getPath('temp'), `avwan-guide-${process.pid}.html`)
  const win = new BrowserWindow({ width: 816, height: 1056, show: false, webPreferences: { sandbox: true, contextIsolation: true } })
  try {
    fs.writeFileSync(file, html)
    await win.loadFile(file)
    if (BrowserWindow.getAllWindows().some((w) => w.isVisible())) throw new Error('Une fenêtre est visible : arrêt.')
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
    const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
    fs.mkdirSync(OUT_DIR, { recursive: true })
    fs.writeFileSync(OUT, pdf)
    console.log(`Guide écrit : ${path.relative(ROOT, OUT)}`)
  } finally {
    fs.rmSync(file, { force: true })
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
