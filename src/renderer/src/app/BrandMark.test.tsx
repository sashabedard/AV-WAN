// src/renderer/src/app/BrandMark.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { BrandMark } from './BrandMark'

afterEach(cleanup)

describe('BrandMark', () => {
  it('dessine la tuile, trois fiches et trois cordons, sans couleur en dur', () => {
    const { container } = render(<BrandMark size={32} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('.brandmark__plug')).toHaveLength(3)
    expect(container.querySelectorAll('.brandmark__cord')).toHaveLength(3)
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{6}/i)
  })
})
