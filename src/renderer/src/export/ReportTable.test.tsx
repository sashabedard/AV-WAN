// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ReportTable, TablePage } from './ReportTable'
import { TitleBlock } from './TitleBlock'

afterEach(cleanup)

const table = { id: 't', title: 'Liste de branchement', columns: [{ label: 'Câble' }, { label: 'Longueur (m)' }], rows: [['C-001', 1.5], ['C-002', null]] }

describe('tableaux imprimés', () => {
  it('affiche les en-têtes et les cellules : nombres à la française, vides en tiret', () => {
    render(<ReportTable table={table} />)
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Câble', 'Longueur (m)'])
    expect(screen.getAllByRole('cell').map((c) => c.textContent)).toEqual(['C-001', '1,5', 'C-002', '—'])
  })

  it('dit qu’un tableau est vide au lieu d’imprimer un tableau sans ligne', () => {
    render(<TablePage table={{ ...table, rows: [] }} empty="Aucun câble dans le projet." />)
    expect(screen.getByRole('heading', { name: 'Liste de branchement' })).toBeTruthy()
    expect(screen.getByText('Aucun câble dans le projet.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('cartouche', () => {
  it('donne le projet, le cours, les auteurs, la révision, la date et le statut', () => {
    render(<TitleBlock meta={{ title: 'Lumen', authors: ['A. B'], date: '2026-10-13', revision: 'C', status: 'tel-que-construit' }} subtitle="Zone : Régie" />)
    expect(screen.getByText('Lumen')).toBeTruthy()
    expect(screen.getByText('Zone : Régie')).toBeTruthy()
    expect(screen.getByText('Tel que construit')).toBeTruthy()
    expect(screen.getByText('A. B')).toBeTruthy()
  })
})
