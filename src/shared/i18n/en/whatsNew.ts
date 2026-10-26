import type { Messages } from '../messages'

export const whatsNew: Messages['whatsNew'] = {
  title: 'What’s new in AV·WAN 1.5 ✨',
  intro: 'An update full of little touches for your control rooms, your servers and your virtual machines. Enjoy!',
  items: [
    { title: 'Several IPs per port', text: 'Each network port takes as many addresses as you like: “+ IP”, static or DHCP.' },
    { title: 'Editable cards and ports', text: 'Add a GPU, network or capture card, rename or remove ports. DisplayPort joins the party.' },
    { title: 'Port side by type', text: 'Network on the left, video on the right, power at the bottom: each kind of port picks its side.' },
    { title: 'VMs inside the host tile', text: 'Your virtual machines nest inside their server, with their bridged vNICs and their IPs.' },
    { title: 'Hardware section', text: 'OS, CPU, RAM, storage and GPU, for physical machines and VMs alike.' },
    { title: 'Richer reports', text: 'The IP plan lists every address, VMs included, and device sheets show hardware and VMs.' }
  ],
  noteTitle: 'Good to know',
  note: 'Files saved with 1.5 no longer open correctly in 1.4; the first time you open a file, a .bak copy of your original is created next to it.',
  close: 'Let’s go!'
}
