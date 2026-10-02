import { openDB } from 'idb'
import type { GameMode, GameSelectionState, LockedCellGroup } from '@/game/gameConfig'

export interface StoredGame {
  id: string
  updatedAt: number
  state: unknown
}

interface CornerominoDatabase {
  games: {
    key: string
    value: StoredGame
  }
}

export const db = openDB<CornerominoDatabase>('corneromino', 1, {
  upgrade(database) {
    database.createObjectStore('games', { keyPath: 'id' })
  },
})

function selectionStorageKey(gameMode: GameMode, gameId: string): string {
  return `selection:${gameMode}:${gameId}`
}

function isLockedCellGroup(value: unknown): value is LockedCellGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'cellKeys' in value &&
    Array.isArray(value.cellKeys) &&
    value.cellKeys.every((cellKey) => typeof cellKey === 'string') &&
    'color' in value &&
    typeof value.color === 'string' &&
    'id' in value &&
    typeof value.id === 'string'
  )
}

function isGameSelectionState(state: unknown): state is GameSelectionState | Omit<GameSelectionState, 'lockedCellGroups'> {
  return (
    typeof state === 'object' &&
    state !== null &&
    'selectedCellKeys' in state &&
    Array.isArray(state.selectedCellKeys) &&
    state.selectedCellKeys.every((cellKey) => typeof cellKey === 'string') &&
    (!('lockedCellGroups' in state) || (Array.isArray(state.lockedCellGroups) && state.lockedCellGroups.every(isLockedCellGroup)))
  )
}

export async function loadGameSelection(gameMode: GameMode, gameId: string): Promise<GameSelectionState> {
  const storedGame = await (await db).get('games', selectionStorageKey(gameMode, gameId))
  if (!storedGame || !isGameSelectionState(storedGame.state)) {
    return { lockedCellGroups: [], selectedCellKeys: [] }
  }

  return {
    lockedCellGroups: 'lockedCellGroups' in storedGame.state ? storedGame.state.lockedCellGroups : [],
    selectedCellKeys: storedGame.state.selectedCellKeys,
  }
}

export async function saveGameSelection(gameMode: GameMode, gameId: string, selection: GameSelectionState): Promise<void> {
  await (await db).put('games', {
    id: selectionStorageKey(gameMode, gameId),
    updatedAt: Date.now(),
    state: selection,
  })
}

export async function clearGameSelection(gameMode: GameMode, gameId: string): Promise<void> {
  await (await db).delete('games', selectionStorageKey(gameMode, gameId))
}
