import { openDB } from 'idb'

export interface StoredGame {
  id: string
  updatedAt: number
  state: unknown
}

interface GameSelectionState {
  selectedCellKeys: string[]
}

interface CornerminoDatabase {
  games: {
    key: string
    value: StoredGame
  }
}

export const db = openDB<CornerminoDatabase>('cornermino', 1, {
  upgrade(database) {
    database.createObjectStore('games', { keyPath: 'id' })
  },
})

function selectionStorageKey(gameId: string): string {
  return `selection:${gameId}`
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

export async function loadGameSelection(gameId: string): Promise<string[]> {
  const storedGame = await (await db).get('games', selectionStorageKey(gameId))
  return storedGame && isGameSelectionState(storedGame.state) ? storedGame.state.selectedCellKeys : []
}

export async function saveGameSelection(gameId: string, selectedCellKeys: Iterable<string>): Promise<void> {
  await (await db).put('games', {
    id: selectionStorageKey(gameId),
    updatedAt: Date.now(),
    state: { selectedCellKeys: [...selectedCellKeys] },
  })
}

export async function clearGameSelection(gameId: string): Promise<void> {
  await (await db).delete('games', selectionStorageKey(gameId))
}
