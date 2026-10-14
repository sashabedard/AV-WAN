import { expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#123456"/><script>alert(1)</script></svg>'

test('créer une composante avec une icône SVG, la placer, et la retrouver chez quelqu’un qui ne l’a pas', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'avwan-comp-')), 'lidar.avwan')
  const { app, page } = await launchApp()
  try {
    await page.getByRole('button', { name: 'Nouvelle composante' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nouvelle composante' })
    await dialog.getByLabel('Nom', { exact: true }).fill('Capteur LiDAR')
    await dialog.getByLabel('Code', { exact: true }).fill('lid')
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await dialog.getByLabel('PoE du port 1').selectOption('in-af')
    await dialog.getByLabel('Connecteur à ajouter').selectOption('usb')
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await dialog.getByLabel('Fichier d’icône').setInputFiles({ name: 'lidar.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) })
    await expect(dialog.locator('.ce__preview .icon--mask')).toHaveCount(1)
    await dialog.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(dialog).toHaveCount(0)

    const item = page.getByRole('region', { name: 'Mes composantes' }).locator('[data-testid^="palette-custom-"]')
    await expect(item).toHaveCount(1)
    await item.click()
    await page.locator('.react-flow__pane').click({ position: { x: 380, y: 260 } })
    const project = await page.evaluate(() => window.__avwan!.getProject())
    expect(project.devices).toHaveLength(1)
    expect(project.devices[0]).toMatchObject({ name: 'LID-1', ports: [{ id: 'ETH1', poeIn: 'af' }, { id: 'USB1', connector: 'usb' }] })
    expect(project.templates).toHaveLength(1)
    await expect(page.locator('.react-flow__node .icon--mask')).toHaveCount(1)
    await page.evaluate((p) => window.__avwan!.saveTo(p), file)
  } finally {
    await app.close()
  }

  // Quelqu'un d'autre : userData neuf, bibliothèque vide.
  const other = await launchApp()
  try {
    expect(await other.page.evaluate((p) => window.__avwan!.openPath(p), file)).toBe(true)
    const project = await other.page.evaluate(() => window.__avwan!.getProject())
    expect(project.devices[0]!.name).toBe('LID-1')
    expect(project.templates[0]!.icon).toMatchObject({ kind: 'image', tint: true })
    await expect(other.page.getByRole('region', { name: 'Ce projet' }).getByText('Capteur LiDAR')).toBeVisible()
    await expect(other.page.getByText('Créez vos propres appareils avec +.')).toBeVisible()
    await expect(other.page.locator('.react-flow__node .icon--mask')).toHaveCount(1)
  } finally {
    await other.app.close()
  }
})
