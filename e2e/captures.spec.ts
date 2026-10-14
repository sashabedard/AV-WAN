import { test, type Page } from '@playwright/test'
import { launchApp } from './helpers'

// Les nombres seuls sont des ratios dans React Flow : on passe des « px » explicites.
const px = (n: number): `${number}px` => `${n}px`

// Cadre le projet au-dessus de la légende (bas droite) et de la minicarte (bas gauche) : on réserve
// leur place en bas, mesurée sur la page.
async function frameClearOfOverlays(page: Page): Promise<void> {
  const pane = await page.locator('.react-flow').boundingBox()
  const legend = await page.locator('.legend').boundingBox()
  const minimap = await page.locator('.react-flow__minimap').boundingBox()
  if (!pane) throw new Error('Canvas introuvable')
  const tops = [legend, minimap].flatMap((b) => (b ? [b.y] : []))
  const gutter = 28
  const bottom = Math.ceil(pane.y + pane.height - Math.min(...tops)) + gutter
  await page.evaluate((pad) => window.__avwan!.fitView(pad), { top: px(gutter), left: px(gutter), right: px(gutter), bottom: px(bottom) })
}

// Captures du README : projet exemple, une caméra sélectionnée, thèmes sombre et clair.
// npm run captures — fenêtre jamais visible, rendu à 2× pour un affichage net.
test('captures du README', async () => {
  test.skip(!process.env['AVWAN_CAPTURES'], 'captures à la demande seulement (npm run captures)')
  const { app, page } = await launchApp({ keepWelcome: true, scale: 2 })
  try {
    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    await page.evaluate(() => window.__avwan!.select({ deviceIds: ['ex-cam1'], linkIds: [] }))
    const toggle = page.locator('button.topbar__btn[aria-label^="Thème"]')
    for (const [label, name] of [
      ['Thème : sombre', 'sombre'],
      ['Thème : clair', 'clair']
    ] as const) {
      // Le bouton du thème de l'app tourne : système, clair, sombre (au plus trois clics).
      for (let i = 0; i < 3 && (await toggle.getAttribute('aria-label')) !== label; i++) await toggle.click()
      await page.mouse.move(0, 0)
      await frameClearOfOverlays(page)
      await page.waitForTimeout(500)
      await page.screenshot({ path: `.github/assets/capture-${name}.png` })
    }
  } finally {
    await app.close()
  }
})
