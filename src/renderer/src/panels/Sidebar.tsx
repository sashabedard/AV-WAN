// src/renderer/src/panels/Sidebar.tsx
import { uiStore, useUiStore } from '../store/uiStore'
import { useT } from '../i18n/useT'
import { Icon } from '../icons/Icon'
import { Palette } from './Palette'
import { VlanPanel } from './VlanPanel'
import './panels.css'

export function Sidebar() {
  const tab = useUiStore((s) => s.sidebarTab)
  const { m } = useT()
  return (
    <div className="sidebar">
      <div className="tabs" role="tablist" aria-label={m.panels.sidebarLabel}>
        <button type="button" role="tab" id="tab-devices" aria-selected={tab === 'devices'} aria-controls="panel-left" className="tab" onClick={() => uiStore.getState().setSidebarTab('devices')}>
          <Icon name="devices" size={15} />
          {m.panels.tabDevices}
        </button>
        <button type="button" role="tab" id="tab-vlans" aria-selected={tab === 'vlans'} aria-controls="panel-left" className="tab" onClick={() => uiStore.getState().setSidebarTab('vlans')}>
          <Icon name="vlan" size={15} />
          {m.panels.tabVlans}
        </button>
      </div>
      <div role="tabpanel" id="panel-left" aria-labelledby={tab === 'devices' ? 'tab-devices' : 'tab-vlans'}>
        {tab === 'devices' ? <Palette /> : <VlanPanel />}
      </div>
    </div>
  )
}
