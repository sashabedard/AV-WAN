import { describe, expect, it } from 'vitest'
import { isDataTables, toCsv, type Cell, type DataTable } from './tables'

const table = (rows: Cell[][]): DataTable => ({ id: 't', title: 'T', columns: [{ label: 'Nom' }, { label: 'Longueur (m)' }], rows })

describe('toCsv', () => {
  it('écrit un CSV pour Excel en français : BOM, « ; », virgule décimale, CRLF', () => {
    expect(toCsv(table([['C-001', 12], ['C-002', 1.5], ['C-003', null]]))).toBe('﻿Nom;Longueur (m)\r\nC-001;12\r\nC-002;1,5\r\nC-003;\r\n')
  })

  it('met entre guillemets une cellule qui contient « ; », un guillemet ou un saut de ligne', () => {
    expect(toCsv(table([['Régie; baie "A"\nhaut', 1]])).split('\r\n')[1]).toBe('"Régie; baie ""A""\nhaut";1')
  })

  it('neutralise un texte qu’Excel prendrait pour une formule, mais pas un nombre négatif', () => {
    const lines = toCsv(table([['=HYPERLINK("x")', 1], ['+33', 2], ['-cmd', 3], ['@SUM', 4], ['C-1', -2]])).split('\r\n')
    expect(lines.slice(1, 6)).toEqual(['"\'=HYPERLINK(""x"")";1', "'+33;2", "'-cmd;3", "'@SUM;4", 'C-1;-2'])
  })
})

describe('isDataTables', () => {
  const ok = { id: 'plan-ip', title: 'Plan d’adressage IP', columns: [{ label: 'Appareil' }], rows: [['CAM-1'], [null], [12]] }

  it('accepte des tableaux bien formés', () => {
    expect(isDataTables([ok])).toBe(true)
    expect(isDataTables([])).toBe(true)
  })

  it('refuse un identifiant qui sortirait du dossier, ou des cellules d’un autre type', () => {
    expect(isDataTables([{ ...ok, id: '../../etc/x' }])).toBe(false)
    expect(isDataTables([{ ...ok, rows: [[{ a: 1 }]] }])).toBe(false)
    expect(isDataTables([{ ...ok, columns: [{}] }])).toBe(false)
    expect(isDataTables('tableaux')).toBe(false)
  })
})
