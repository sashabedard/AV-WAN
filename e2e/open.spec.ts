import { expect, test } from '@playwright/test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'

const SALLE_B = {
  schemaVersion: 1,
  meta: { title: 'Salle B', authors: [], date: '2026-10-14', revision: 'A', status: 'conception' },
  settings: { colorMode: 'vlan', pageFormat: 'na', cableIdPrefix: 'C-', snapToGrid: true },
  vlans: [],
  devices: [],
  links: [],
  zones: [],
  templates: []
}

test('un .avwan reçu du système (open-file) s’ouvre, puis ⌘S l’écrit en place', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'avwan-open-')), 'salle-b.avwan')
  writeFileSync(file, `${JSON.stringify(SALLE_B, null, 2)}\n`)
  const { app, page } = await launchApp({ keepWelcome: true })
  try {
    await app.evaluate(({ app }, path) => {
      app.emit('open-file', { preventDefault: () => undefined }, path)
    }, file)
    await expect(page.getByTestId('file-name')).toHaveText('salle-b.avwan')
    await expect(page.getByRole('dialog', { name: 'Accueil' })).toHaveCount(0)
    expect((await page.evaluate(() => window.__avwan!.getProject())).meta.title).toBe('Salle B')

    await page.getByTestId('palette-ptz-ndi').click()
    await page.locator('.react-flow__pane').click({ position: { x: 360, y: 300 } })
    await page.evaluate(() => window.__avwan!.menu('save'))
    await expect.poll(() => (JSON.parse(readFileSync(file, 'utf8')) as { devices: unknown[] }).devices.length).toBe(1)
  } finally {
    await app.close()
  }
})
