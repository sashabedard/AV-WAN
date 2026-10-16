import { useCallback, useEffect, useMemo, useState } from 'react'
import { applyNodeChanges, type NodeChange } from '@xyflow/react'
import type { Project } from '../model/types'
import type { ThemeMode } from './cordStyle'
import { useLang } from '../i18n/useT'
import { analyzeLinks, createFlowCache, toFlowEdges, toFlowNodes, toFlowZones, type CordFlowEdge, type FlowNode } from './toFlow'
import { mergeNodes } from './canvasHelpers'

export interface StaticFlow {
  nodes: FlowNode[]
  edges: CordFlowEdge[]
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
}

// Nœuds et cordons d'un canvas sans édition (PDF en thème clair, vignette épinglée au thème de l'app),
// dérivés du projet.
export function useStaticFlow(project: Project, theme: ThemeMode): StaticFlow {
  const lang = useLang()
  const [cache] = useState(createFlowCache)
  const analysis = useMemo(() => analyzeLinks(project, theme, lang), [project, theme, lang])
  const derivedNodes = useMemo<FlowNode[]>(() => [...toFlowZones(project, cache), ...toFlowNodes(project, analysis, cache, lang)], [project, analysis, cache, lang])
  // React Flow 12 renvoie les dimensions mesurées par onNodesChange : sans les appliquer aux nœuds,
  // useNodesInitialized() resterait faux et le PDF attendrait jusqu'au délai maximal (comme Canvas).
  const [nodes, setNodes] = useState(derivedNodes)
  useEffect(() => setNodes((prev) => mergeNodes(derivedNodes, prev)), [derivedNodes])
  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), [])
  const edges = useMemo<CordFlowEdge[]>(() => toFlowEdges(project, analysis, cache), [project, analysis, cache])
  return { nodes, edges, onNodesChange }
}
