import { openDB } from 'idb'
import type { GameMode } from '@/game/placement'

export interface StoredGame {
  id: string
  updatedAt: number
  state: unknown
}

interface GameSelectionState {
  selectedCellKeys: string[]
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

function isGameSelectionState(state: unknown): state is GameSelectionState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'selectedCellKeys' in state &&
    Array.isArray(state.selectedCellKeys) &&
    state.selectedCellKeys.every((cellKey) => typeof cellKey === 'string')
  )
}

export async function loadGameSelection(gameMode: GameMode, gameId: string): Promise<string[]> {
  const storedGame = await (await db).get('games', selectionStorageKey(gameMode, gameId))
  return storedGame && isGameSelectionState(storedGame.state) ? storedGame.state.selectedCellKeys : []
}

export async function saveGameSelection(gameMode: GameMode, gameId: string, selectedCellKeys: Iterable<string>): Promise<void> {
  await (await db).put('games', {
    id: selectionStorageKey(gameMode, gameId),
    updatedAt: Date.now(),
    state: { selectedCellKeys: [...selectedCellKeys] },
  })
}

export async function clearGameSelection(gameMode: GameMode, gameId: string): Promise<void> {
  await (await db).delete('games', selectionStorageKey(gameMode, gameId))
}
