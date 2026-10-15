import { expect, test } from '@playwright/test'
import { launchApp } from './helpers'

test('projet exemple : recherche, renommage, couleur, zone, copier-coller, annuler', async () => {
  const { app, page } = await launchApp({ keepWelcome: true })
  try {
    const project = () => page.evaluate(() => window.__avwan!.getProject())

    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    let p = await project()
    expect(p.devices).toHaveLength(24)
    expect(p.zones).toHaveLength(3)

    // ⌘K : chercher « ptz » et placer avec Entrée
    await page.evaluate(() => window.__avwan!.menu('search'))
    await page.getByRole('dialog', { name: 'Rechercher un appareil' }).getByLabel('Rechercher').fill('ptz')
    await page.keyboard.press('Enter')
    p = await project()
    expect(p.devices).toHaveLength(25)
    const added = p.devices.at(-1)!
    expect(added).toMatchObject({ templateId: 'ptz-ndi', name: 'CAM-3' })

    // Renommer par double-clic sur l'étiquette ruban
    const tape = page.locator(`.react-flow__node[data-id="${added.id}"] .dn__tape`)
    await expect(tape).toBeVisible()
    await tape.dblclick()
    await page.getByRole('textbox', { name: 'Nom de l’appareil' }).fill('CAM-SCENE')
    await page.keyboard.press('Enter')
    expect((await project()).devices.find((d) => d.id === added.id)!.name).toBe('CAM-SCENE')

    // Mode de couleur Type, sans entrée d'historique
    await page.getByRole('group', { name: 'Mode de couleur' }).getByRole('button', { name: 'Type' }).click()
    expect((await project()).settings.colorMode).toBe('type')

    // ⌘G : une zone autour de la nouvelle caméra
    await page.evaluate((id) => window.__avwan!.select({ deviceIds: [id], linkIds: [] }), added.id)
    await page.evaluate(() => window.__avwan!.menu('groupZone'))
    p = await project()
    expect(p.zones).toHaveLength(4)
    expect(p.devices.find((d) => d.id === added.id)!.zoneId).toBe(p.zones.at(-1)!.id)

    // Copier puis coller (les gestionnaires du document, comme le menu natif)
    await page.evaluate(() => {
      const data = new DataTransfer()
      document.dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }))
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
    })
    await expect.poll(async () => (await project()).devices.length).toBe(26)

    // ⌘Z défait le collage, pas le mode de couleur
    await page.evaluate(() => window.__avwan!.menu('undo'))
    p = await project()
    expect(p.devices).toHaveLength(25)
    expect(p.settings.colorMode).toBe('type')
  } finally {
    await app.close()
  }
})

test('configurateur de switch : popover borné, focalisé, fermé par Échap ou un clic à l’extérieur', async () => {
  const { app, page } = await launchApp()
  try {
    const deviceCount = async () => (await page.evaluate(() => window.__avwan!.getProject())).devices.length
    const popover = page.locator('.popover')
    const pane = page.locator('.react-flow__pane')
    const win = page.viewportSize() ?? (await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })))

    const open = async (): Promise<void> => {
      await page.getByTestId('palette-switch').click()
      // Près du bord droit du canvas : le popover doit être ramené dans la fenêtre.
      const box = await pane.boundingBox()
      if (!box) throw new Error('Canvas introuvable')
      await page.mouse.click(box.x + box.width - 8, box.y + box.height - 8)
      await expect(popover.getByRole('dialog', { name: 'Configurer le switch' })).toBeVisible()
    }

    await open()
    const box = await popover.boundingBox()
    if (!box) throw new Error('Popover introuvable')
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(win.width)
    expect(box.y + box.height).toBeLessThanOrEqual(win.height)
    expect(await page.evaluate(() => !!document.activeElement?.closest('.popover'))).toBe(true)

    // Échap ferme sans créer d'appareil
    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)
    expect(await deviceCount()).toBe(0)

    // Rouvrir, puis un clic à l'extérieur ferme sans créer d'appareil
    await open()
    await page.locator('.topbar').click({ position: { x: 300, y: 4 } })
    await expect(popover).toHaveCount(0)
    expect(await deviceCount()).toBe(0)
  } finally {
    await app.close()
  }
})
