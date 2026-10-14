// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StaticViewContext, useLocked } from './staticView'
import { projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'

afterEach(cleanup)

const staticWrapper = ({ children }: { children: ReactNode }) => <StaticViewContext.Provider value={true}>{children}</StaticViewContext.Provider>

describe('useLocked', () => {
  it('suit la lecture seule du fichier hors vue statique', () => {
    projectStore.getState().loadProject(sampleProject(), null)
    expect(renderHook(() => useLocked()).result.current).toBe(false)
    projectStore.getState().loadProject(sampleProject(), null, { readOnly: true })
    expect(renderHook(() => useLocked()).result.current).toBe(true)
  })

  it('est vrai dans une vue statique (vignette, PDF), même si le fichier est modifiable', () => {
    projectStore.getState().loadProject(sampleProject(), null)
    expect(renderHook(() => useLocked(), { wrapper: staticWrapper }).result.current).toBe(true)
  })
})
