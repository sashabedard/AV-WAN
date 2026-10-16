import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { buildXlsx, sheetName } from './spreadsheet'

describe('buildXlsx', () => {
  it('écrit une feuille par liste, en-têtes en gras et figés, filtres, vrais nombres', async () => {
    const buf = await buildXlsx([
      { id: 'branchement', title: 'Liste de branchement', columns: [{ label: 'Câble', width: 9 }, { label: 'Longueur (m)' }], rows: [['C-001', 12], ['C-002', null]] },
      { id: 'plan-ip', title: 'Plan d’adressage IP', columns: [{ label: 'Appareil' }], rows: [] }
    ], 'fr')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as never) // ExcelJS type ses tampons à sa façon : on lui passe le Buffer de Node tel quel
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Liste de branchement', 'Plan d’adressage IP'])
    const ws = wb.worksheets[0]!
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(ws.autoFilter).toBeTruthy()
    expect(ws.getCell('A1').value).toBe('Câble')
    expect(ws.getCell('A1').font?.bold).toBe(true)
    expect(ws.getCell('B2').value).toBe(12)
    expect(ws.getCell('B3').value).toBeNull()
  })
})

describe('sheetName', () => {
  it('retire les caractères refusés par Excel et coupe à 31 caractères', () => {
    expect(sheetName('Plan: IP/VLAN [2026] *très* long nom de feuille', 'fr')).toBe('Plan- IP-VLAN -2026- -très- lon')
    expect(sheetName('', 'fr')).toBe('Feuille')
    expect(sheetName('', 'en')).toBe('Sheet')
  })
})
