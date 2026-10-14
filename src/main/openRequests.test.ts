import { describe, expect, it, vi } from 'vitest'
import { createOpenQueue, pathsFromArgv } from './openRequests'

describe('pathsFromArgv', () => {
  it('garde les .avwan (casse ignorée), sans options ni doublons, dans l’ordre', () => {
    const argv = ['C:\\Program Files\\AV-WAN\\AV-WAN.exe', '--allow-file-access-from-files', 'C:\\x\\Salle.AVWAN', '/y/b.avwan', '/y/notes.txt', '/y/b.avwan']
    expect(pathsFromArgv(argv)).toEqual(['C:\\x\\Salle.AVWAN', '/y/b.avwan'])
  })

  it('ignore une option qui finit par .avwan', () => {
    expect(pathsFromArgv(['--file=/x/a.avwan'])).toEqual([])
  })
})

describe('createOpenQueue', () => {
  it('garde les chemins tant que l’interface n’est pas prête, puis les livre dans l’ordre', () => {
    const deliver = vi.fn()
    const q = createOpenQueue(deliver)
    q.push('/a.avwan')
    q.push('/b.avwan')
    q.push('/a.avwan')
    expect(deliver).not.toHaveBeenCalled()
    expect(q.pending()).toEqual(['/a.avwan', '/b.avwan'])
    q.ready()
    expect(deliver.mock.calls).toEqual([['/a.avwan'], ['/b.avwan']])
    expect(q.pending()).toEqual([])
  })

  it('livre tout de suite une fois prête, et attend de nouveau après reset', () => {
    const deliver = vi.fn()
    const q = createOpenQueue(deliver)
    q.ready()
    q.push('/a.avwan')
    expect(deliver).toHaveBeenCalledWith('/a.avwan')
    q.reset()
    q.push('/b.avwan')
    expect(deliver).toHaveBeenCalledTimes(1)
    q.ready()
    expect(deliver).toHaveBeenLastCalledWith('/b.avwan')
  })
})
