import { describe, expect, it } from 'vitest'
import { createSeededRandom, generateTetrominoPlacements } from './placement'
import { CELL_CORNERS, GAME_CONFIGS, type GameConfig } from './gameConfig'

describe('generateTetrominoPlacements', () => {
  const config: GameConfig = { columns: 8, rows: 8, spread: 0.5, tetrominoCount: 5 }

  it('places the requested number of four-cell tetrominoes inside the board', () => {
    const pieces = generateTetrominoPlacements(config, createSeededRandom('test-seed'))

    expect(pieces).toHaveLength(5)
    expect(pieces.map((piece) => piece.id)).toEqual([1, 2, 3, 4, 5])
    for (const piece of pieces) {
      expect(piece.cells).toHaveLength(4)
      expect(new Set(piece.cells.map((cell) => cell.cellId))).toEqual(new Set(['a', 'b', 'c', 'd']))
      expect(piece.cells.every((cell) => cell.x >= 0 && cell.x < config.columns && cell.y >= 0 && cell.y < config.rows)).toBe(true)
    }
  })

  it('never overlaps cells and assigns every corner exactly once per piece', () => {
    const pieces = generateTetrominoPlacements(config, createSeededRandom('another-test-seed'))
    const occupiedCells = pieces.flatMap((piece) => piece.cells.map((cell) => `${cell.x},${cell.y}`))

    expect(new Set(occupiedCells)).toHaveLength(occupiedCells.length)
    for (const piece of pieces) {
      expect(new Set(piece.cells.map((cell) => cell.corner))).toEqual(new Set(CELL_CORNERS))
    }
  })

  it('generates the same placements for the same seed', () => {
    const first = generateTetrominoPlacements(config, createSeededRandom('corneromino'))
    const second = generateTetrominoPlacements(config, createSeededRandom('corneromino'))

    expect(first).toEqual(second)
  })

  it('uses different configurations for each game mode', () => {
    expect(GAME_CONFIGS.easy).not.toEqual(GAME_CONFIGS.medium)
    expect(GAME_CONFIGS.medium).not.toEqual(GAME_CONFIGS.hard)
  })

  it('requires spread to be between zero and one', () => {
    expect(() => generateTetrominoPlacements({ ...config, spread: -0.1 })).toThrow('Spread')
    expect(() => generateTetrominoPlacements({ ...config, spread: 1.1 })).toThrow('Spread')
  })

})
