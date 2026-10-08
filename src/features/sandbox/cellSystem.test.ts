import { describe, expect, it } from 'vitest'
import { SandboxCellSystem } from './cellSystem'

describe('SandboxCellSystem', () => {
  it('aligns a right-side corner with a left neighbor right-side corner', () => {
    const system = new SandboxCellSystem([
      { cellKey: '0,0', corner: 1 },
      { cellKey: '1,0', corner: 1 },
    ])

    system.rotateCornerFromUser('0,0')
    system.processUpdates(1)

    expect(system.getCorner('0,0')).toBe(2)
    expect(system.getCorner('1,0')).toBe(2)
    expect(system.getCorner('0,1')).toBeUndefined()
  })

  it('does not send an update directly back to its sender', () => {
    const system = new SandboxCellSystem([
      { cellKey: '0,0', corner: 1 },
      { cellKey: '1,0', corner: 1 },
    ])

    system.rotateCornerFromUser('0,0')
    system.processUpdates(1)

    expect(system.getCorner('0,0')).toBe(2)
  })

  it('does not update a neighbor when removing a corner', () => {
    const system = new SandboxCellSystem([
      { cellKey: '0,0', corner: 1 },
      { cellKey: '1,0', corner: 1 },
    ])

    system.removeCornerFromUser('0,0')
    system.processUpdates(1)

    expect(system.getCorner('0,0')).toBeUndefined()
    expect(system.getCorner('1,0')).toBe(1)
  })

  it('aligns a left-side corner with a right neighbor left-side corner', () => {
    const system = new SandboxCellSystem([
      { cellKey: '0,0', corner: 0 },
      { cellKey: '1,0', corner: 1 },
    ])

    system.rotateCornerFromUser('1,0')
    system.processUpdates(1)
    system.rotateCornerFromUser('1,0')
    system.processUpdates(1)

    expect(system.getCorner('0,0')).toBe(3)
  })

  it('aligns a top-side corner with a bottom neighbor top-side corner', () => {
    const system = new SandboxCellSystem([
      { cellKey: '0,0', corner: 1 },
      { cellKey: '0,1', corner: 3 },
    ])

    system.rotateCornerFromUser('0,1')
    system.processUpdates(1)

    expect(system.getCorner('0,0')).toBe(0)
  })

  it('mirrors a right-side corner when its left neighbor faces left', () => {
    const system = new SandboxCellSystem([
      { cellKey: '0,0', corner: 3 },
      { cellKey: '1,0', corner: 1 },
    ])

    system.rotateCornerFromUser('0,0')
    system.processUpdates(1)

    expect(system.getCorner('1,0')).toBe(2)
  })

  it('mirrors a top-side corner when its bottom neighbor faces down', () => {
    const system = new SandboxCellSystem([
      { cellKey: '0,0', corner: 0 },
      { cellKey: '0,1', corner: 2 },
    ])

    system.rotateCornerFromUser('0,1')
    system.processUpdates(1)

    expect(system.getCorner('0,0')).toBe(1)
  })

  it('prioritizes a same-facing neighbor over a mirrored neighbor', () => {
    const system = new SandboxCellSystem([
      { cellKey: '0,0', corner: 0 },
      { cellKey: '1,0', corner: 1 },
      { cellKey: '1,1', corner: 2 },
    ])

    system.rotateCornerFromUser('0,0')
    system.processUpdates(1)

    expect(system.getCorner('1,0')).toBe(1)
  })
})
