// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SwitchConfigurator, withBudget } from './SwitchConfigurator'

afterEach(cleanup)

const initial = { portCount: 8 as const, poe: 'at' as const, poeBudgetW: 120, sfpPlus: 2 as const, managed: true }

describe('SwitchConfigurator', () => {
  it('met à jour le budget par défaut quand la taille change', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SwitchConfigurator initial={initial} submitLabel="Créer" onSubmit={onSubmit} onCancel={() => undefined} />)
    await user.click(within(screen.getByRole('group', { name: 'Nombre de ports' })).getByRole('button', { name: '24' }))
    expect((screen.getByLabelText('Budget PoE en watts') as HTMLInputElement).value).toBe('400')
    expect(screen.getByTestId('cfg-summary').textContent).toBe('24×PoE+ · 2×SFP+')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(onSubmit).toHaveBeenCalledWith({ portCount: 24, poe: 'at', poeBudgetW: 400, sfpPlus: 2, managed: true })
  })

  it('garde un budget saisi à la main et le retire sans PoE', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SwitchConfigurator initial={initial} submitLabel="Créer" onSubmit={onSubmit} onCancel={() => undefined} />)
    const budget = screen.getByLabelText('Budget PoE en watts')
    await user.clear(budget)
    await user.type(budget, '90')
    await user.click(within(screen.getByRole('group', { name: 'Nombre de ports' })).getByRole('button', { name: '16' }))
    expect((screen.getByLabelText('Budget PoE en watts') as HTMLInputElement).value).toBe('90')
    await user.click(within(screen.getByRole('group', { name: 'PoE' })).getByRole('button', { name: 'Aucun' }))
    expect(screen.queryByLabelText('Budget PoE en watts')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(onSubmit).toHaveBeenCalledWith({ portCount: 16, poe: 'none', sfpPlus: 2, managed: true })
  })

  it('Échap annule', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<SwitchConfigurator initial={initial} submitLabel="Créer" onSubmit={() => undefined} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})

describe('withBudget', () => {
  it('applique le budget par défaut, sauf saisie manuelle', () => {
    expect(withBudget({ portCount: 48, poe: 'bt', sfpPlus: 4, managed: true }, false).poeBudgetW).toBe(1000)
    expect(withBudget({ portCount: 48, poe: 'bt', poeBudgetW: 500, sfpPlus: 4, managed: true }, true).poeBudgetW).toBe(500)
  })
})
