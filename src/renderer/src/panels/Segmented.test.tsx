// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Segmented } from './Segmented'

afterEach(cleanup)

const OPTIONS = [
  { value: 'static', label: 'Statique' },
  { value: 'dhcp', label: 'DHCP' }
] as const

describe('Segmented', () => {
  it('ne signale rien quand on reclique la valeur active (pas d’entrée d’historique)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Segmented ariaLabel="Mode IP" options={OPTIONS} value="static" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Statique' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'DHCP' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('dhcp')
  })
})
