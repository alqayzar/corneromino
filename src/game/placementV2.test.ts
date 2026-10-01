import { describe, expect, it } from 'vitest'
import { createSeededRandom } from './placement'
import { GAME_CONFIGS, type GameConfig } from './gameConfig'
import { generateTetrominoPlacementsV2 } from './placementV2'

describe('generateTetrominoPlacementsV2', () => {
  const testConfig: GameConfig = { columns: 8, rows: 8, spread: 0.5, tetrominoCount: 5 }

  it('places every requested tetromino without overlaps', async () => {
    const pieces = await generateTetrominoPlacementsV2(testConfig, {
      random: createSeededRandom('placement-v2'),
      yieldEvery: 10,
    })
    const occupiedCells = pieces.flatMap((piece) => piece.cells.map((cell) => `${cell.x},${cell.y}`))

    expect(pieces).toHaveLength(testConfig.tetrominoCount)
    expect(new Set(occupiedCells)).toHaveLength(occupiedCells.length)
  })

  it('returns the same board for the same seeded random source', async () => {
    const first = await generateTetrominoPlacementsV2(testConfig, {
      random: createSeededRandom('same-v2-seed'),
    })
    const second = await generateTetrominoPlacementsV2(testConfig, {
      random: createSeededRandom('same-v2-seed'),
    })

    expect(first).toEqual(second)
  })

  it('generates every configured mode', async () => {
    for (const [mode, config] of Object.entries(GAME_CONFIGS)) {
      const pieces = await generateTetrominoPlacementsV2(config, {
        random: createSeededRandom(`${mode}:v2`),
      })

      expect(pieces).toHaveLength(config.tetrominoCount)
    }
  })

  it('reports iterations while searching', async () => {
    const progress: number[] = []

    await generateTetrominoPlacementsV2(testConfig, {
      onProgress: (iterations) => progress.push(iterations),
      progressEvery: 10,
      random: createSeededRandom('v2-progress'),
      yieldEvery: 10,
    })

    expect(progress.length).toBeGreaterThan(0)
    expect(progress.every((iterations, index) => index === 0 || iterations > progress[index - 1])).toBe(true)
    expect(progress.slice(0, -1).every((iterations) => iterations % 10 === 0)).toBe(true)
  })

  it('reports the final iteration count even when no yield is needed', async () => {
    const progress: number[] = []

    await generateTetrominoPlacementsV2(testConfig, {
      onProgress: (iterations) => progress.push(iterations),
      random: createSeededRandom('v2-final-progress'),
      yieldEvery: 1_000_000,
    })

    expect(progress.at(-1)).toBeGreaterThan(0)
  })
})
