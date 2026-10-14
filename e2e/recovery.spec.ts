import { expect, test } from '@playwright/test'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'

function recoveryFiles(userData: string): string[] {
  try {
    return readdirSync(join(userData, 'recovery')).filter((n) => n.endsWith('.json'))
  } catch {
    return []
  }
}

test('après un arrêt brutal, l’accueil propose la copie ; Restaurer puis ⌘S écrit le fichier d’origine', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'avwan-recovery-'))
  const file = join(mkdtempSync(join(tmpdir(), 'avwan-file-')), 'salle-b.avwan')
  const env = { AVWAN_AUTOSAVE_MS: '400' }

  const first = await launchApp({ userData, env })
  let killed = false
  try {
    const pane = first.page.locator('.react-flow__pane')
    await first.page.getByTestId('palette-ptz-ndi').click()
    await pane.click({ position: { x: 300, y: 220 } })
    await first.page.evaluate((p) => window.__avwan!.saveTo(p), file)
    await first.page.getByTestId('palette-dante-avio').click()
    await pane.click({ position: { x: 560, y: 220 } })
    // Une seule copie reste : celle du fichier enregistré (clé f-…).
    await expect.poll(() => recoveryFiles(userData), { timeout: 10_000 }).toEqual([expect.stringMatching(/^f-[0-9a-f]{16}\.json$/)])
    first.app.process().kill('SIGKILL') // arrêt brutal : rien n'est fermé proprement
    killed = true
  } finally {
    if (!killed) await first.app.close()
  }

  const { app, page } = await launchApp({ userData, env, keepWelcome: true })
  try {
    const welcome = page.getByRole('dialog', { name: 'Accueil' })
    await expect(welcome.getByRole('region', { name: 'Travail non enregistré' })).toBeVisible()
    await welcome.getByRole('button', { name: 'Restaurer salle-b.avwan' }).click()
    await expect(welcome).toHaveCount(0)
    expect((await page.evaluate(() => window.__avwan!.getProject())).devices).toHaveLength(2)
    await expect(page).toHaveTitle('● salle-b.avwan — AV·WAN')
    await page.evaluate(() => window.__avwan!.menu('save'))
    await expect.poll(() => (JSON.parse(readFileSync(file, 'utf8')) as { devices: unknown[] }).devices.length).toBe(2)
    await expect.poll(() => recoveryFiles(userData)).toEqual([])
  } finally {
    await app.close()
  }
})
