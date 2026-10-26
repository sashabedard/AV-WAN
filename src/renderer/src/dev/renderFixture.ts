import type { Device, IpConfig, Link, Project } from '../model/types'
import { withPrimaryIp } from '../model/ips'
import { createDevice, createProject } from '../model/project'
import { setLinkVlan, type VlanChoice } from '../model/derive'
import { vlanPreset } from '../catalog/vlanPresets'

// Banc de rendu (spec § 13, « Rendu ») : switchs 8, 24 et 48 ports, des tuiles, et un cordon de chaque
// sorte (cuivre PoE, fibre trunk à bagues, DAC, Wi-Fi, lien simple). Identifiants fixes : les captures
// de référence restent comparables d'une exécution à l'autre.
export function makeRenderFixture(): Project {
  const base = createProject(new Date(2026, 9, 13), 'fr')
  let p: Project = { ...base, meta: { ...base.meta, title: 'Banc de rendu' }, vlans: [10, 20, 30, 40, 60].map((id) => vlanPreset(id, 'fr')) }
  const add = (id: string, templateId: string, x: number, y: number, extra: Partial<Device> & { ip?: IpConfig } = {}, switchSpec?: Device['switch']): void => {
    const d = createDevice(p, templateId, { x, y }, { id, lang: 'fr', ...(switchSpec ? { switchSpec } : {}) })
    const { ip, ...rest } = extra
    const device: Device = { ...d, ...rest }
    p = { ...p, devices: [...p.devices, ip ? withPrimaryIp(device, ip) : device] }
  }
  const link = (id: string, a: [string, string], b: [string, string], medium: Link['medium'], vlan: VlanChoice): void => {
    const cableId = `C-${String(p.links.length + 1).padStart(3, '0')}`
    const l: Link = { id, cableId, a: { deviceId: a[0], portId: a[1] }, b: { deviceId: b[0], portId: b[1] }, medium, lengthM: 5 }
    p = setLinkVlan({ ...p, links: [...p.links, l] }, id, vlan)
  }
  add('r-sw8', 'switch', 0, 0, {}, { portCount: 8, poe: 'at', poeBudgetW: 120, sfpPlus: 2, managed: true })
  add('r-sw24', 'switch', 0, 200, {}, { portCount: 24, poe: 'at', poeBudgetW: 400, sfpPlus: 2, managed: true })
  add('r-sw48', 'switch', 0, 420, {}, { portCount: 48, poe: 'bt', poeBudgetW: 1000, sfpPlus: 4, managed: true })
  add('r-cam', 'ptz-ndi', 520, 0, { ip: { address: '10.40.0.21', mode: 'static' } })
  add('r-ap', 'ap', 760, 200, { ip: { address: '10.10.10.4', mode: 'static' } })
  add('r-iot', 'esp32-devkit', 1000, 200, { ip: { address: '', mode: 'dhcp' } })
  add('r-pix', 'pixel-controller', 760, 420, { ip: { address: '10.50.0.20', mode: 'static' } })
  add('r-led', 'led-strip', 760, 560)
  link('r-l1', ['r-cam', 'ETH'], ['r-sw8', '1'], 'cat6', { kind: 'access', vlan: 40 })
  link('r-l2', ['r-sw8', 'SFP+1'], ['r-sw24', 'SFP+1'], 'om4', { kind: 'trunk', native: 10, tagged: [10, 20, 30, 40] })
  link('r-l3', ['r-sw24', 'SFP+2'], ['r-sw48', 'SFP+1'], 'dac', { kind: 'trunk', native: 10, tagged: 'all' })
  link('r-l4', ['r-ap', 'ETH'], ['r-sw24', '2'], 'cat6', { kind: 'trunk', native: 10, tagged: [10, 60] })
  link('r-l5', ['r-iot', 'WIFI'], ['r-ap', 'WIFI'], 'wifi', { kind: 'access', vlan: 60 })
  link('r-l6', ['r-pix', 'OUT1'], ['r-led', 'IN'], 'pixel', { kind: 'none' })
  return p
}

// Banc des VMs (spec cartes-ip-vms) : un hôte à carte GPU, côtés par type, matériel et deux VMs imbriquées.
// Banc séparé : les captures du banc de rendu ne bougent pas.
export function makeVmFixture(): Project {
  const base = createProject(new Date(2026, 9, 26), 'fr')
  const host: Device = {
    ...createDevice(base, 'media-server', { x: 0, y: 0 }, { id: 'v-hv', lang: 'fr' }),
    name: 'SRV-HV-01',
    specs: { os: 'Proxmox 8', cpu: '2× Xeon', ramGb: 256, gpu: '2× A6000' },
    cards: [{ id: 'g1', name: 'GPU 1' }],
    portSides: { reseau: 'left', video: 'right' }
  }
  host.ports = [...host.ports, ...['1', '2', '3', '4'].map((n) => ({ id: `DP-${n}`, label: `DP ${n}`, connector: 'displayport' as const, cardId: 'g1' }))]
  host.portState = { ETH1: { ips: [{ address: '10.40.0.30', mode: 'static' }] } }
  return {
    ...base,
    meta: { ...base.meta, title: 'Banc des VMs' },
    vlans: [vlanPreset(40, 'fr')],
    devices: [host],
    vms: [
      {
        id: 'v-vm1', hostId: 'v-hv', name: 'VM Show', specs: { os: 'Ubuntu 24.04', vcpu: 8, ramGb: 32 },
        vnics: [
          { id: 'v-n1', label: 'vnic0', bridgePortId: 'ETH1', ips: [{ address: '10.40.0.32', mode: 'static' }] },
          { id: 'v-n2', label: 'vnic1', bridgePortId: 'ETH2', ips: [{ address: '', mode: 'dhcp' }] }
        ]
      },
      { id: 'v-vm2', hostId: 'v-hv', name: 'VM Contrôle', specs: { os: 'Windows 11', vcpu: 4, ramGb: 16 }, vnics: [{ id: 'v-n3', label: 'vnic0', bridgePortId: 'ETH1', ips: [{ address: '10.40.0.33', mode: 'static' }] }] }
    ]
  }
}

