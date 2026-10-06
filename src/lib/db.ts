import { openDB } from 'idb'
import { isGameMode, type GameMode, type GameSelectionState, type LockedCellGroup } from '@/game/gameConfig'

export interface StoredGame {
  id: string
  updatedAt: number
  state: unknown
}

export interface SavedGame {
  gameId: string
  gameMode: GameMode
  savedAt: number
  screenshot: Blob
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

function isGameSelectionState(state: unknown): state is {
  gameGridScreenshot?: Blob | null
  lockedCellGroups?: LockedCellGroup[]
  savedAt?: number | null
  selectedCellKeys: string[]
} {
  return (
    typeof state === 'object' &&
    state !== null &&
    'selectedCellKeys' in state &&
    Array.isArray(state.selectedCellKeys) &&
    state.selectedCellKeys.every((cellKey) => typeof cellKey === 'string') &&
    (!('lockedCellGroups' in state) || (Array.isArray(state.lockedCellGroups) && state.lockedCellGroups.every(isLockedCellGroup))) &&
    (!('gameGridScreenshot' in state) || state.gameGridScreenshot === null || state.gameGridScreenshot instanceof Blob) &&
    (!('savedAt' in state) || state.savedAt === null || typeof state.savedAt === 'number')
  )
}

export async function loadGameSelection(gameMode: GameMode, gameId: string): Promise<GameSelectionState> {
  const storedGame = await (await db).get('games', selectionStorageKey(gameMode, gameId))
  if (!storedGame || !isGameSelectionState(storedGame.state)) {
    return { gameGridScreenshot: null, lockedCellGroups: [], savedAt: null, selectedCellKeys: [] }
  }

  return {
    gameGridScreenshot: 'gameGridScreenshot' in storedGame.state && storedGame.state.gameGridScreenshot instanceof Blob
      ? storedGame.state.gameGridScreenshot
      : null,
    lockedCellGroups: 'lockedCellGroups' in storedGame.state ? storedGame.state.lockedCellGroups : [],
    savedAt: 'savedAt' in storedGame.state && typeof storedGame.state.savedAt === 'number' ? storedGame.state.savedAt : null,
    selectedCellKeys: storedGame.state.selectedCellKeys,
  }
}

export async function loadSavedGames(): Promise<SavedGame[]> {
  const storedGames = await (await db).getAll('games')

  return storedGames.flatMap((storedGame) => {
    if (!isGameSelectionState(storedGame.state) || !storedGame.state.gameGridScreenshot || !storedGame.state.savedAt) {
      return []
    }

    const [prefix, gameMode, ...gameIdParts] = storedGame.id.split(':')
    if (prefix !== 'selection' || !isGameMode(gameMode) || gameIdParts.length === 0) {
      return []
    }

    return [{
      gameId: gameIdParts.join(':'),
      gameMode,
      savedAt: storedGame.state.savedAt,
      screenshot: storedGame.state.gameGridScreenshot,
    }]
  }).sort((firstGame, secondGame) => secondGame.savedAt - firstGame.savedAt)
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

export async function deleteSavedGame(gameMode: GameMode, gameId: string): Promise<void> {
  await clearGameSelection(gameMode, gameId)
}
