// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { LangOverrideProvider, useT } from './useT'
import { uiStore } from '../store/uiStore'

function Probe() {
  const { m, fmt } = useT()
  return <span>{`${m.common.cancel} ${fmt.num(1.5)}`}</span>
}

afterEach(() => {
  cleanup()
  act(() => uiStore.getState().setLang('fr'))
})

describe('useT', () => {
  it('suit la langue de l’interface', () => {
    render(<Probe />)
    expect(screen.getByText('Annuler 1,5')).toBeTruthy()
    act(() => uiStore.getState().setLang('en'))
    expect(screen.getByText('Cancel 1.5')).toBeTruthy()
  })
  it('une langue imposée (fenêtre PDF) l’emporte sur celle de l’interface', () => {
    render(
      <LangOverrideProvider lang="en">
        <Probe />
      </LangOverrideProvider>
    )
    expect(screen.getByText('Cancel 1.5')).toBeTruthy()
  })
})
