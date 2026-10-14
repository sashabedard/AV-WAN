import { expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'
import { hasRasterImage, near, readPdf } from './pdf'

const exportDir = (): string => mkdtempSync(join(tmpdir(), 'avwan-export-'))

test('exporte le projet exemple en PDF vectoriel : schéma en Tabloïd, tableau en Lettre, cartouche', async () => {
  const dir = exportDir()
  const { app, page } = await launchApp({ keepWelcome: true, env: { AVWAN_E2E_EXPORT_DIR: dir } })
  try {
    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    const path = await page.evaluate(() => window.__avwan!.exportPdf({ sections: ['schema', 'branchement'], format: 'na', zonePages: false }))
    expect(path).toBe(join(dir, 'Installation interactive (exemple).pdf'))
    const { pages, bytes } = await readPdf(path!)
    expect(hasRasterImage(bytes)).toBe(false)
    expect(near(pages[0]!.width, 1224) && near(pages[0]!.height, 792)).toBe(true)
    expect(pages.length).toBeGreaterThan(1)
    for (const p of pages.slice(1)) expect(near(p.width, 612) && near(p.height, 792)).toBe(true)
    expect(pages[0]!.text).toContain('SW-1')
    expect(pages[0]!.text).toContain('CAM-1')
    expect(pages[0]!.text).toContain('Installation interactive (exemple)')
    expect(pages[0]!.text).toMatch(new RegExp(`Page\\s*1\\s*/\\s*${pages.length}`))
    const tables = pages.slice(1).map((p) => p.text).join(' ')
    expect(tables).toContain('Liste de branchement')
    expect(tables).toContain('C-001')
    expect(tables).toContain('C-018')
    // La fenêtre d'impression est détruite, et aucune fenêtre n'a jamais été visible.
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => w.isVisible()))).toEqual([false])
  } finally {
    await app.close()
  }
})

test('exporte un projet vide en A3 + A4 sans attendre', async () => {
  const dir = exportDir()
  const { app, page } = await launchApp({ env: { AVWAN_E2E_EXPORT_DIR: dir } })
  try {
    const path = await page.evaluate(() => window.__avwan!.exportPdf({ sections: ['schema', 'branchement'], format: 'iso', zonePages: true }))
    const { pages } = await readPdf(path!)
    expect(pages).toHaveLength(2)
    expect(near(pages[0]!.width, 1191) && near(pages[0]!.height, 842)).toBe(true)
    expect(near(pages[1]!.width, 595) && near(pages[1]!.height, 842)).toBe(true)
    expect(pages[0]!.text).toContain('Aucun appareil sur le schéma.')
    expect(pages[1]!.text).toContain('Aucun câble dans le projet.')
  } finally {
    await app.close()
  }
})
