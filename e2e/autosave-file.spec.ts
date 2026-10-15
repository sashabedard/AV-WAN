import { expect, test } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'

const PROJET = {
  schemaVersion: 1,
  meta: { title: 'Salle C', authors: [], date: '2026-10-14', revision: 'A', status: 'conception' },
  settings: { colorMode: 'vlan', pageFormat: 'na', cableIdPrefix: 'C-', snapToGrid: true },
  vlans: [],
  devices: [],
  links: [],
  zones: [],
  templates: []
}

const deviceCount = (file: string): number => (JSON.parse(readFileSync(file, 'utf8')) as { devices: unknown[] }).devices.length

function writeProject(): string {
  const file = join(mkdtempSync(join(tmpdir(), 'avwan-autosave-')), 'salle-c.avwan')
  writeFileSync(file, `${JSON.stringify(PROJET, null, 2)}\n`)
  return file
}

test('un projet ouvert s’enregistre seul dans son fichier, sans ⌘S', async () => {
  const file = writeProject()
  const { app, page } = await launchApp({ autoSave: true, keepWelcome: true })
  try {
    await app.evaluate(({ app }, path) => {
      app.emit('open-file', { preventDefault: () => undefined }, path)
    }, file)
    await expect(page.getByTestId('file-name')).toHaveText('salle-c.avwan')
    await page.getByTestId('palette-ptz-ndi').click()
    await page.locator('.react-flow__pane').click({ position: { x: 360, y: 300 } })
    await expect.poll(() => deviceCount(file), { timeout: 10_000 }).toBe(1)
    await expect.poll(() => page.title(), { timeout: 10_000 }).not.toMatch(/^●/)
  } finally {
    await app.close()
  }
})

test('un projet sans titre reçoit son fichier dans Documents › AV·WAN', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'avwan-docs-'))
  const { app, page } = await launchApp({ autoSave: true, env: { AVWAN_E2E_DOCUMENTS_DIR: dir } })
  try {
    await page.getByTestId('palette-ptz-ndi').click()
    await page.locator('.react-flow__pane').click({ position: { x: 360, y: 300 } })
    const file = join(dir, 'Nouveau projet.avwan')
    await expect.poll(() => existsSync(file) && deviceCount(file), { timeout: 10_000 }).toBe(1)
    await expect(page.getByTestId('file-name')).toHaveText('Nouveau projet.avwan')
  } finally {
    await app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('Revenir à la version d’ouverture rend le projet tel qu’ouvert, et ⌘Z le rétablit', async () => {
  const file = writeProject()
  const { app, page } = await launchApp({ autoSave: true, keepWelcome: true })
  try {
    page.on('dialog', (d) => void d.accept())
    await app.evaluate(({ app }, path) => {
      app.emit('open-file', { preventDefault: () => undefined }, path)
    }, file)
    await expect(page.getByTestId('file-name')).toHaveText('salle-c.avwan')
    await page.getByTestId('palette-ptz-ndi').click()
    await page.locator('.react-flow__pane').click({ position: { x: 360, y: 300 } })
    await expect.poll(() => deviceCount(file), { timeout: 10_000 }).toBe(1)

    await page.evaluate(() => window.__avwan!.menu('revertToOpened'))
    await expect.poll(async () => (await page.evaluate(() => window.__avwan!.getProject())).devices, { timeout: 10_000 }).toEqual([])

    await page.evaluate(() => window.__avwan!.menu('undo'))
    expect((await page.evaluate(() => window.__avwan!.getProject())).devices).toHaveLength(1)
  } finally {
    await app.close()
  }
})
