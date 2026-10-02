import type { CellId, TetrominoKind } from './tetrominoes'

export interface GameConfig {
  columns: number
  rows: number
  /** 0 uses the full board; 1 strongly favors placements around its center. */
  spread: number
  tetrominoCount: number
}

export const GAME_MODES = ['easy', 'medium', 'hard'] as const
export type GameMode = (typeof GAME_MODES)[number]

export const GAME_CONFIGS = {
  easy: { columns: 8, rows: 8, spread: 0, tetrominoCount: 10 },
  medium: { columns: 10, rows: 15, spread: 0.5, tetrominoCount: 20 },
  hard: { columns: 12, rows: 18, spread: 0.8, tetrominoCount: 35 },
} as const satisfies Record<GameMode, GameConfig>

export function isGameMode(value: string | null): value is GameMode {
  return GAME_MODES.some((mode) => mode === value)
}

export const CELL_CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const
export type CellCorner = (typeof CELL_CORNERS)[number]

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

export interface LockedCellGroup {
  cellKeys: string[]
  color: string
  id: string
}

export interface GameSelectionState {
  lockedCellGroups: LockedCellGroup[]
  selectedCellKeys: string[]
}
