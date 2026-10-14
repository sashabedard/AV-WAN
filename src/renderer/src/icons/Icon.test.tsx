// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { DeviceIcon, Icon } from './Icon'
import { GLYPHS } from './glyphs'

afterEach(cleanup)

describe('Icon', () => {
  it('dessine un tracé par élément du glyphe, décoratif par défaut', () => {
    const { container } = render(<Icon name="switch" size={18} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('width')).toBe('18')
    expect(svg.querySelectorAll('path')).toHaveLength(GLYPHS.switch.length)
  })

  it('devient une image nommée quand on lui donne un titre', () => {
    render(<Icon name="search" title="Rechercher" />)
    expect(screen.getByRole('img', { name: 'Rechercher' })).toBeTruthy()
  })

  it('affiche une icône importée, ou l’icône générique pour un nom inconnu', () => {
    const { container, rerender } = render(<DeviceIcon icon={{ kind: 'image', dataUri: 'data:image/png;base64,AAAA' }} />)
    expect(container.querySelector('img')!.getAttribute('src')).toBe('data:image/png;base64,AAAA')
    rerender(<DeviceIcon icon={{ kind: 'builtin', name: 'inconnu' }} />)
    expect(container.querySelectorAll('path')).toHaveLength(GLYPHS.generic.length)
  })
})
