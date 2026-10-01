import { createTetrominoCells, TETROMINOES, TETROMINO_KINDS, type CellId, type TetrominoKind } from './tetrominoes'

export interface GameConfig {
  columns: number
  rows: number
  tetrominoCount: number
}

export const CELL_CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const
export type CellCorner = (typeof CELL_CORNERS)[number]

export const DEFAULT_GAME_CONFIG: Readonly<GameConfig> = {
  columns: 10,
  rows: 15,
  tetrominoCount: 25,
}

export interface PlacedTetrominoCell {
  cellId: CellId
  corner: CellCorner
  x: number
  y: number
}

export interface PlacedTetromino {
  id: number
  kind: TetrominoKind
  cells: readonly PlacedTetrominoCell[]
}

/** Creates a deterministic pseudo-random number generator for a seed value. */
export function createSeededRandom(seed: string): () => number {
  let state = 1779033703 ^ seed.length

  for (let index = 0; index < seed.length; index += 1) {
    state = Math.imul(state ^ seed.charCodeAt(index), 3432918353)
    state = (state << 13) | (state >>> 19)
  }

  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507)
    state = Math.imul(state ^ (state >>> 13), 3266489909)
    state ^= state >>> 16
    return (state >>> 0) / 4294967296
  }
}

export function createRandomSeed(): string {
  return crypto.randomUUID()
}

function getRandomItem<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

function shuffleCorners(random: () => number): CellCorner[] {
  const corners = [...CELL_CORNERS]

  for (let index = corners.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[corners[index], corners[swapIndex]] = [corners[swapIndex], corners[index]]
  }

  return corners
}

function validateConfig({ columns, rows, tetrominoCount }: GameConfig): void {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1) {
    throw new Error('Board columns and rows must be positive integers.')
  }

  if (!Number.isInteger(tetrominoCount) || tetrominoCount < 0) {
    throw new Error('Tetromino count must be a non-negative integer.')
  }
}

/**
 * Randomly places tetrominoes on the board. Cells may touch, but no two cells
 * will occupy the same coordinate.
 */
export function generateTetrominoPlacements(
  config: GameConfig = DEFAULT_GAME_CONFIG,
  random: () => number = Math.random,
): PlacedTetromino[] {
  validateConfig(config)

  const occupied = new Set<string>()
  const placements: PlacedTetromino[] = []
  const attemptsPerPiece = 500

  for (let id = 1; id <= config.tetrominoCount; id += 1) {
    let placement: PlacedTetromino | undefined

    for (let attempt = 0; attempt < attemptsPerPiece; attempt += 1) {
      const kind = getRandomItem(TETROMINO_KINDS, random)
      const rotation = getRandomItem(TETROMINOES[kind].rotations, random)
      const localCells = createTetrominoCells(kind, rotation.turns)
      const width = Math.max(...localCells.map((cell) => cell.x)) + 1
      const height = Math.max(...localCells.map((cell) => cell.y)) + 1

      if (width > config.columns || height > config.rows) continue

      const offsetX = Math.floor(random() * (config.columns - width + 1))
      const offsetY = Math.floor(random() * (config.rows - height + 1))
      const corners = shuffleCorners(random)
      const cells = localCells.map(({ id: cellId, x, y }, index) => ({
        cellId,
        corner: corners[index],
        x: x + offsetX,
        y: y + offsetY,
      }))

      if (cells.some((cell) => occupied.has(`${cell.x},${cell.y}`))) continue

      placement = {
        id,
        kind,
        cells,
      }
      break
    }

    if (!placement) {
      throw new Error(`Could not place tetromino ${id} without overlapping another piece.`)
    }

    for (const cell of placement.cells) {
      occupied.add(`${cell.x},${cell.y}`)
    }
    placements.push(placement)
  }

  return placements
}
