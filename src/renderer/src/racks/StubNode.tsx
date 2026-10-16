import { memo, type CSSProperties } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { STUB_HANDLE, type StubData } from './toRackFlow'
import { RACK_STUB_H, RACK_STUB_W } from './rackLayout'

// Bout d'un câble qui sort de la baie (spec § 8.5) : une étiquette « → appareil · prise » au bord de la baie.
// Jamais une cible de branchement.
function StubNodeImpl({ data }: NodeProps<Node<StubData, 'stub'>>) {
  return (
    <div className="rstub" style={{ height: RACK_STUB_H, maxWidth: RACK_STUB_W, '--plug': data.color } as CSSProperties} title={data.label} data-testid={`rack-stub-${data.cableId}`}>
      <Handle id={STUB_HANDLE} type="source" position={Position.Left} isConnectable={false} className="rstub__handle" />
      <span className="rstub__text">{data.label}</span>
    </div>
  )
}

export const StubNode = memo(StubNodeImpl)
