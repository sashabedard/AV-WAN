import { expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'

test('placer, brancher, régler un VLAN, enregistrer et rouvrir', async () => {
  const { app, page } = await launchApp()
  const pane = page.locator('.react-flow__pane')

  // Placement par clic (palette, puis canvas)
  await page.getByTestId('palette-switch').click()
  await pane.click({ position: { x: 360, y: 160 } })
  await page.getByRole('dialog', { name: 'Configurer le switch' }).getByRole('button', { name: 'Créer' }).click()
  await page.getByTestId('palette-ptz-ndi').click()
  await pane.click({ position: { x: 360, y: 440 } })

  let project = await page.evaluate(() => window.__avwan!.getProject())
  expect(project.devices.map((d) => d.templateId)).toEqual(['switch', 'ptz-ndi'])
  const sw = project.devices[0]!
  const cam = project.devices[1]!

  // Glisser la prise ETH de la caméra et la lâcher sur l'oreille du switch (loin des ports).
  // React Flow garde un nœud neuf en visibility: hidden tant qu'il ne l'a pas mesuré : un appui à ce
  // moment traverse la prise et fait glisser le canvas. On attend que les deux nœuds soient mesurés.
  const handle = page.locator(`.react-flow__node[data-id="${cam.id}"] .react-flow__handle[data-handleid="ETH"]`)
  const switchNode = page.locator(`.react-flow__node[data-id="${sw.id}"]`)
  await expect(handle).toBeVisible()
  await expect(switchNode).toBeVisible()
  const hb = await handle.boundingBox()
  const sb = await switchNode.boundingBox()
  if (!hb || !sb) throw new Error('Éléments introuvables')
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(sb.x + 5, sb.y + sb.height / 2, { steps: 15 })
  await page.mouse.up()

  project = await page.evaluate(() => window.__avwan!.getProject())
  expect(project.links).toHaveLength(1)
  const link = project.links[0]!
  expect(link.cableId).toBe('C-001')
  const switchEnd = link.a.deviceId === sw.id ? link.a : link.b
  expect(switchEnd.portId).toBe('1')
  await expect(page.getByTestId('cord-C-001')).toHaveCount(1)

  // Régler le VLAN dans l'inspecteur
  await page.evaluate((id) => window.__avwan!.select({ deviceIds: [], linkIds: [id] }), link.id)
  await page.getByLabel('Mode VLAN').selectOption('access')
  await page.getByLabel('VLAN d’accès').selectOption('40')
  project = await page.evaluate(() => window.__avwan!.getProject())
  expect(project.devices.find((d) => d.id === sw.id)!.portState['1']).toMatchObject({ mode: 'access', nativeVlan: 40 })

  // Enregistrer, fermer, rouvrir
  const file = join(mkdtempSync(join(tmpdir(), 'avwan-file-')), 'lumen.avwan')
  await page.evaluate((p) => window.__avwan!.saveTo(p), file)
  await expect(page.getByTestId('file-name')).toHaveText('lumen.avwan')
  await app.close()

  const second = await launchApp()
  expect(await second.page.evaluate((p) => window.__avwan!.openPath(p), file)).toBe(true)
  const reopened = await second.page.evaluate(() => window.__avwan!.getProject())
  expect(reopened.devices).toHaveLength(2)
  expect(reopened.links).toHaveLength(1)
  expect(reopened.devices.find((d) => d.templateId === 'switch')!.portState['1']).toMatchObject({ mode: 'access', nativeVlan: 40 })
  await second.app.close()
})
