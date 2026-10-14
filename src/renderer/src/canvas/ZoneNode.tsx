// src/renderer/src/canvas/ZoneNode.tsx
import { memo, useState, type CSSProperties } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { projectStore, useProjectStore } from '../store/projectStore'
import type { ZoneFlowNode } from './toFlow'
import { InlineName } from './InlineName'

function ZoneNodeImpl({ id, data, selected }: NodeProps<ZoneFlowNode>) {
  const readOnly = useProjectStore((s) => s.readOnly)
  const [renaming, setRenaming] = useState(false)
  const { zone } = data
  return (
    <div className={`zone${selected ? ' zone--selected' : ''}`} style={{ '--zone': zone.color } as CSSProperties} data-testid={`zone-${zone.name}`}>
      <NodeResizer
        isVisible={selected && !readOnly}
        minWidth={160}
        minHeight={96}
        handleClassName="zone__handle"
        lineClassName="zone__line"
        onResizeEnd={(_e, r) =>
          projectStore.getState().resizeZone(id, { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) })
        }
      />
      {renaming ? (
        <InlineName
          value={zone.name}
          label="Nom de la zone"
          className="inline-name--zone"
          onCommit={(name) => projectStore.getState().updateZone(id, { name })}
          onDone={() => setRenaming(false)}
        />
      ) : (
        <div
          className="zone__title"
          title={readOnly ? zone.name : `${zone.name} · glisser pour déplacer la zone et ses appareils · double-clic pour renommer`}
          onDoubleClick={(e) => {
            if (readOnly) return
            e.stopPropagation()
            setRenaming(true)
          }}
        >
          {zone.name}
        </div>
      )}
    </div>
  )
}

export const ZoneNode = memo(ZoneNodeImpl)
