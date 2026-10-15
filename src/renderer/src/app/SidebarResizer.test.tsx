// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarResizer } from './SidebarResizer'
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_WIDTH_KEY } from './sidebarWidth'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderInShell() {
  const { container } = render(
    <div className="shell">
      <SidebarResizer />
    </div>
  )
  return { shell: container.firstElementChild as HTMLElement, handle: screen.getByRole('separator', { name: 'Largeur du panneau de gauche' }) }
}

describe('SidebarResizer', () => {
  it('pose la largeur enregistrée sur .shell', () => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, '300')
    const { shell, handle } = renderInShell()
    expect(shell.style.getPropertyValue('--left-w')).toBe('300px')
    expect(handle.getAttribute('aria-valuenow')).toBe('300')
  })

  it('les flèches élargissent ou rétrécissent, Fin va au maximum, et la largeur est retenue', async () => {
    const user = userEvent.setup()
    const { shell, handle } = renderInShell()
    handle.focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(shell.style.getPropertyValue('--left-w')).toBe(`${SIDEBAR_DEFAULT + 32}px`)
    await user.keyboard('{ArrowLeft}')
    expect(handle.getAttribute('aria-valuenow')).toBe(String(SIDEBAR_DEFAULT + 16))
    await user.keyboard('{End}')
    expect(localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBe(String(SIDEBAR_MAX))
  })

  it('un double-clic remet la largeur d’origine', () => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, '420')
    const { shell, handle } = renderInShell()
    fireEvent.doubleClick(handle)
    expect(shell.style.getPropertyValue('--left-w')).toBe(`${SIDEBAR_DEFAULT}px`)
  })
})
