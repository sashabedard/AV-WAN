import { expect, test } from '@playwright/test'
import { launchApp } from './helpers'

// Captures de référence du canvas (spec § 13, « Rendu ») : façades 8, 24 et 48 ports, une tuile et
// les cordons, dans les deux thèmes. Mise à jour volontaire : npm run rendu:maj (une seule exécution).
const NODES = [
  ['r-sw8', 'switch-8'],
  ['r-sw24', 'switch-24'],
  ['r-sw48', 'switch-48'],
  ['r-cam', 'tuile']
] as const
const SHOT = { animations: 'disabled', maxDiffPixelRatio: 0.01 } as const

test('captures de référence du canvas', async () => {
  const { app, page } = await launchApp()
  try {
    await page.evaluate(() => window.__avwan!.loadRenderFixture())
    const toggle = page.locator('button.topbar__btn[aria-label^="Thème"]')
    for (const [label, theme] of [
      ['Thème : clair', 'clair'],
      ['Thème : sombre', 'sombre']
    ] as const) {
      // Le bouton du thème tourne : système, clair, sombre (au plus trois clics).
      for (let i = 0; i < 3 && (await toggle.getAttribute('aria-label')) !== label; i++) await toggle.click()
      await page.mouse.move(0, 0)
      await page.evaluate(() => window.__avwan!.fitView(0.08))
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(300)
      for (const [id, name] of NODES) {
        await expect(page.locator(`.react-flow__node[data-id="${id}"]`)).toHaveScreenshot(`${name}-${theme}.png`, SHOT)
      }
      await expect(page.locator('.react-flow')).toHaveScreenshot(`cordons-${theme}.png`, SHOT)
    }
  } finally {
    await app.close()
  }
})

// Hôte de VMs (spec cartes-ip-vms) : tuiles de VM dans le nœud de l'hôte, sous la ligne matériel.
// Sans capture de référence (pas d'image dans git) : la mise en page est vérifiée par ses mesures.
test('hôte de VMs : tuiles imbriquées et ligne matériel', async () => {
  const { app, page } = await launchApp()
  try {
    await page.evaluate(() => window.__avwan!.loadVmFixture())
    await page.evaluate(() => window.__avwan!.setViewport({ x: 80, y: 80, zoom: 1 }))
    const host = page.locator('.react-flow__node[data-id="v-hv"]')
    const tiles = host.locator('.vm')
    await expect(tiles).toHaveCount(2)
    await expect(host.locator('.dn__hw')).toContainText('2× Xeon · 256 Go · 2× A6000')
    await expect(tiles.first()).toContainText('vnic1 · DHCP')
    const box = (await host.boundingBox())!
    for (const tile of await tiles.all()) {
      const t = (await tile.boundingBox())!
      expect(t.x).toBeGreaterThanOrEqual(box.x)
      expect(t.y + t.height).toBeLessThanOrEqual(box.y + box.height + 0.5)
      expect(t.x + t.width).toBeLessThanOrEqual(box.x + box.width + 0.5)
    }
  } finally {
    await app.close()
  }
})
