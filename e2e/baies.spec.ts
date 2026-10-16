import { expect, test } from '@playwright/test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'
import { hasRasterImage, near, readPdf } from './pdf'

test('vue Baies : un projet avec une baie s’affiche, et le PDF imprime son élévation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'avwan-baies-'))
  const { app, page } = await launchApp({ keepWelcome: true, env: { AVWAN_E2E_EXPORT_DIR: dir } })
  try {
    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    // Le projet exemple, avec SW-1 en U1 et MAC-1 en U3 (2U) d'une baie de 12U.
    const project = await page.evaluate(() => window.__avwan!.getProject())
    const withRack = {
      ...project,
      racks: [{ id: 'r1', name: 'BAIE-1', heightU: 12 }],
      devices: project.devices.map((d) => (d.name === 'SW-1' ? { ...d, rack: { rackId: 'r1', u: 1, heightU: 1 } } : d.name === 'MAC-1' ? { ...d, rack: { rackId: 'r1', u: 3, heightU: 2 } } : d))
    }
    const file = join(dir, 'baies.avwan')
    writeFileSync(file, `${JSON.stringify(withRack, null, 2)}\n`)
    expect(await page.evaluate((p) => window.__avwan!.openPath(p), file)).toBe(true)
    await page.evaluate(() => window.__avwan!.setView('racks'))
    await expect(page.getByText('BAIE-1').first()).toBeVisible()
    await expect(page.getByTestId('device-SW-1')).toBeVisible()
    await expect(page.getByTestId('rack-device-MAC-1')).toBeVisible()

    const path = await page.evaluate(() => window.__avwan!.exportPdf({ sections: ['baies'], format: 'na', zonePages: false, lang: 'fr' }))
    const { pages, bytes } = await readPdf(path!)
    expect(hasRasterImage(bytes)).toBe(false)
    expect(pages).toHaveLength(1)
    expect(near(pages[0]!.width, 1224) && near(pages[0]!.height, 792)).toBe(true)
    expect(pages[0]!.text).toContain('Élévation · BAIE-1')
    expect(pages[0]!.text).toContain('SW-1')
    expect(pages[0]!.text).toContain('MAC-1')
    // Règle de santé : aucune fenêtre visible.
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => w.isVisible()))).toEqual([false])
  } finally {
    await app.close()
  }
})
