import { expect, test } from '@playwright/test'
import { launchApp } from './helpers'

// Le corps d'une zone laisse passer les clics (le canvas les reçoit), mais son titre sélectionne la zone.
test('un clic dans le corps d’une zone atteint le canvas ; le titre sélectionne la zone', async () => {
  const { app, page } = await launchApp()
  try {
    const pane = page.locator('.react-flow__pane')

    // Créer une zone avec l'outil Zone (clic sur le canvas vide).
    await page.getByRole('button', { name: /^Zone/ }).click()
    await pane.click({ position: { x: 200, y: 100 } })
    const zone = (await page.evaluate(() => window.__avwan!.getProject())).zones[0]!
    const zoneNode = page.locator(`.react-flow__node[data-id="${zone.id}"]`)
    await expect(zoneNode).toBeVisible()
    const box = await zoneNode.boundingBox()
    if (!box) throw new Error('Zone introuvable')

    // (a) Gabarit en attente + clic au milieu du corps vide de la zone : l'appareil naît dans la zone.
    await page.getByTestId('palette-ptz-ndi').click()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    const project = await page.evaluate(() => window.__avwan!.getProject())
    expect(project.devices).toHaveLength(1)
    expect(project.devices[0]!.zoneId).toBe(zone.id)

    // (b) Un clic sur le titre sélectionne la zone.
    await page.locator('.zone__title').click()
    await expect(zoneNode).toHaveClass(/selected/)
  } finally {
    await app.close()
  }
})
