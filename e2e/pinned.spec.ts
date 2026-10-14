import { expect, test, type Locator, type Page } from '@playwright/test'
import { launchApp } from './helpers'

async function centerOf(l: Locator): Promise<{ x: number; y: number }> {
  const b = await l.boundingBox()
  if (!b) throw new Error('Élément introuvable')
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
const transformOf = (page: Page, selector: string): Promise<string> => page.locator(selector).evaluate((el) => (el as HTMLElement).style.transform)

// Vue épinglée (spec 2026-10-14) : une vignette figée sur un cadre, à côté de la vue principale libre.
test('vue épinglée : cadre figé, sélection, recentrage, garde-fous, durée de vie', async () => {
  const { app, page } = await launchApp({ keepWelcome: true })
  try {
    const project = () => page.evaluate(() => window.__avwan!.getProject())
    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    const main = page.locator('.canvas')
    const pinned = page.getByRole('region', { name: 'Vue épinglée' })
    const pinnedCam = pinned.locator('.react-flow__node[data-id="ex-cam1"]')

    // 1. Épingler la vue d'ensemble.
    await page.evaluate(() => window.__avwan!.menu('fitView'))
    await page.evaluate(() => window.__avwan!.menu('pinView'))
    await expect(pinned).toBeVisible()
    await expect(pinnedCam).toBeVisible()

    // 2. Un câble tiré d'un port libre de SW-1 et lâché sur la vignette n'est pas créé.
    const linksBefore = (await project()).links.length
    const freePort = main.locator('.react-flow__node[data-id="ex-sw1"] .react-flow__handle[data-handleid="24"]')
    await expect(freePort).toBeVisible()
    const from = await centerOf(freePort)
    const to = await centerOf(pinned.locator('.pinned__body'))
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 15 })
    await page.mouse.up()
    expect((await project()).links).toHaveLength(linksBefore)

    // 3. Zoomer la vue principale ne bouge pas la vignette.
    const pinnedBefore = await transformOf(page, '.pinned .react-flow__viewport')
    const mainBefore = await transformOf(page, '.canvas .react-flow__viewport')
    await page.evaluate(() => window.__avwan!.menu('zoomIn'))
    await expect.poll(() => transformOf(page, '.canvas .react-flow__viewport')).not.toBe(mainBefore)
    expect(await transformOf(page, '.pinned .react-flow__viewport')).toBe(pinnedBefore)

    // 4. Agrandir la vignette par son coin : plafonnée à 60 % de la largeur du canvas.
    const grip = await centerOf(pinned.locator('.pinned__grip'))
    await page.mouse.move(grip.x, grip.y)
    await page.mouse.down()
    await page.mouse.move(grip.x + 300, grip.y + 300, { steps: 5 })
    await page.mouse.up()
    const [pb, cb] = await Promise.all([pinned.boundingBox(), main.boundingBox()])
    if (!pb || !cb) throw new Error('Vignette ou canvas introuvable')
    expect(Math.abs(pb.width - cb.width * 0.6)).toBeLessThanOrEqual(5)

    // Cadrer la vue principale sur CAM-1 au zoom 1,5, puis « Recadrer » la vignette sur cette vue.
    await page.evaluate(() => window.__avwan!.setViewport({ x: 100 - 920 * 1.5, y: 100 - 300 * 1.5, zoom: 1.5 }))
    await pinned.getByRole('button', { name: 'Recadrer' }).click()
    await expect(pinnedCam).toBeVisible()

    // 5. Un clic sur CAM-1 dans la vignette le sélectionne : l'inspecteur et le canvas principal suivent.
    await pinnedCam.click()
    await expect(page.getByRole('textbox', { name: 'Nom', exact: true })).toHaveValue('CAM-1')
    const mainCam = main.locator('.react-flow__node[data-id="ex-cam1"]')
    await expect(mainCam).toHaveClass(/selected/)

    // 5 bis. Un câble cuivre sélectionné montre sa poignée de coude dans le canvas principal, jamais dans la vignette.
    await page.evaluate(() => window.__avwan!.select({ deviceIds: [], linkIds: ['ex-l10'] }))
    await expect(pinned.locator('.react-flow__edge[data-id="ex-l10"]')).toHaveCount(1)
    await expect(page.locator('.pinned .elbow-grip')).toHaveCount(0)
    if ((await main.locator('.react-flow__edge[data-id="ex-l10"]').count()) > 0)
      await expect.poll(() => page.locator('.canvas .elbow-grip').count()).toBeGreaterThanOrEqual(1)

    // 6. Double-clic sur l'étiquette de CAM-1 dans la vignette : pas de renommage, la vue principale se centre sur CAM-1.
    await pinnedCam.locator('.dn__tape').dblclick()
    await expect(page.getByRole('textbox', { name: 'Nom de l’appareil' })).toHaveCount(0)
    await expect
      .poll(async () => {
        const [c, m] = await Promise.all([centerOf(mainCam), centerOf(main)])
        return Math.round(Math.hypot(c.x - m.x, c.y - m.y))
      })
      .toBeLessThanOrEqual(2)

    // 7. Double-clic dans le vide de la vignette : la recherche rapide ne s'ouvre pas.
    const empty = await page.evaluate(() => {
      const pane = document.querySelector('.pinned .react-flow__pane')
      if (!pane) return null
      const r = pane.getBoundingClientRect()
      for (let y = r.top + 8; y < r.bottom - 8; y += 12)
        for (let x = r.left + 8; x < r.right - 8; x += 12) if (document.elementFromPoint(x, y) === pane) return { x, y }
      return null
    })
    if (!empty) throw new Error('Aucun point vide dans la vignette')
    await page.mouse.dblclick(empty.x, empty.y)
    await expect(page.getByRole('dialog', { name: 'Rechercher un appareil' })).toHaveCount(0)

    // 8. Rétrécir la fenêtre : la vignette reste entière dans le canvas.
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(960, 600))
    await expect
      .poll(async () => {
        const [p, c] = await Promise.all([pinned.boundingBox(), page.locator('.shell__center').boundingBox()])
        return !!p && !!c && p.x >= c.x - 1 && p.y >= c.y - 1 && p.x + p.width <= c.x + c.width + 1 && p.y + p.height <= c.y + c.height + 1
      })
      .toBe(true)

    // 9. Nouveau projet : la vignette disparaît.
    await page.evaluate(() => window.__avwan!.menu('new'))
    await expect(pinned).toHaveCount(0)
  } finally {
    await app.close()
  }
})
