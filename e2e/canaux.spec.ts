import { expect, test } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'
import { readPdf } from './pdf'

test('canaux DMX : nommés dans l’inspecteur, retenus dans les réglages, imprimés avec leurs adresses', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'avwan-e2e-'))
  writeFileSync(join(userData, 'settings.json'), JSON.stringify({ autoSave: false }))
  const dir = mkdtempSync(join(tmpdir(), 'avwan-export-'))
  const { app, page } = await launchApp({ keepWelcome: true, userData, env: { AVWAN_E2E_EXPORT_DIR: dir } })
  try {
    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    const fix = await page.evaluate(() => window.__avwan!.getProject().devices.find((d) => d.name === 'FIX-1')!)
    expect(fix.dmx).toMatchObject({ address: 1, footprint: 16 }) // les adresses attendues dans le PDF en dépendent
    const fixId = fix.id
    await page.evaluate((id) => window.__avwan!.select({ deviceIds: [id], linkIds: [] }), fixId)
    await page.getByText(/^Canaux · 16/).click()
    await page.getByLabel('Canal 1', { exact: true }).fill('Red')
    await page.getByLabel('Canal 1', { exact: true }).press('Enter')
    await expect(page.getByLabel('Canal 2', { exact: true })).toBeFocused()
    await page.keyboard.type('Green')
    await page.keyboard.press('Enter')
    const settingsFile = join(userData, 'dmx-channels.json')
    await expect.poll(() => existsSync(settingsFile) && readFileSync(settingsFile, 'utf8').includes('Green')).toBe(true)
    const path = await page.evaluate(() => window.__avwan!.exportPdf({ sections: ['canaux'], format: 'na', zonePages: false }))
    const { pages } = await readPdf(path!)
    const text = pages.map((p) => p.text).join(' ')
    expect(text).toContain('Canaux DMX')
    expect(text).toMatch(/FIX-1 · U[0-9?]+ · 1–16/)
    // Adr. | Ch | Paramètre : adresse réelle = adresse + canal − 1.
    expect(text).toMatch(/\b1 1 Red 2 2 Green 3 3 /)
  } finally {
    await app.close()
  }
})
