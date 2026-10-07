import { openDB } from 'idb'
import { isGameMode, type CellMarker, type GameMode, type GameSelectionState, type LockedCellGroup } from '@/game/gameConfig'

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

function isCellMarker(value: unknown): value is CellMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    'cellKey' in value &&
    typeof value.cellKey === 'string' &&
    'color' in value &&
    (value.color === 'black' || value.color === 'white')
  )
}

function isGameSelectionState(state: unknown): state is {
  elapsedSeconds?: number
  gameGridScreenshot?: Blob | null
  isCompleted?: boolean
  lockedCellGroups?: LockedCellGroup[]
  markers?: CellMarker[]
  markedCellKeys?: string[]
  moveCount?: number
  savedAt?: number | null
  selectedCellKeys: string[]
} {
  return (
    typeof state === 'object' &&
    state !== null &&
    'selectedCellKeys' in state &&
    Array.isArray(state.selectedCellKeys) &&
    state.selectedCellKeys.every((cellKey) => typeof cellKey === 'string') &&
    (!('elapsedSeconds' in state) || (typeof state.elapsedSeconds === 'number' && state.elapsedSeconds >= 0)) &&
    (!('lockedCellGroups' in state) || (Array.isArray(state.lockedCellGroups) && state.lockedCellGroups.every(isLockedCellGroup))) &&
    (!('markers' in state) || (Array.isArray(state.markers) && state.markers.every(isCellMarker))) &&
    (!('markedCellKeys' in state) || (Array.isArray(state.markedCellKeys) && state.markedCellKeys.every((cellKey) => typeof cellKey === 'string'))) &&
    (!('gameGridScreenshot' in state) || state.gameGridScreenshot === null || state.gameGridScreenshot instanceof Blob) &&
    (!('isCompleted' in state) || typeof state.isCompleted === 'boolean') &&
    (!('moveCount' in state) || (typeof state.moveCount === 'number' && state.moveCount >= 0)) &&
    (!('savedAt' in state) || state.savedAt === null || typeof state.savedAt === 'number')
  )
}

export async function loadGameSelection(gameMode: GameMode, gameId: string): Promise<GameSelectionState> {
  const storedGame = await (await db).get('games', selectionStorageKey(gameMode, gameId))
  if (!storedGame || !isGameSelectionState(storedGame.state)) {
    return { elapsedSeconds: 0, gameGridScreenshot: null, isCompleted: false, lockedCellGroups: [], markers: [], moveCount: 0, savedAt: null, selectedCellKeys: [] }
  }

  return {
    elapsedSeconds: 'elapsedSeconds' in storedGame.state && typeof storedGame.state.elapsedSeconds === 'number' ? storedGame.state.elapsedSeconds : 0,
    gameGridScreenshot: 'gameGridScreenshot' in storedGame.state && storedGame.state.gameGridScreenshot instanceof Blob
      ? storedGame.state.gameGridScreenshot
      : null,
    isCompleted: 'isCompleted' in storedGame.state && typeof storedGame.state.isCompleted === 'boolean' ? storedGame.state.isCompleted : false,
    lockedCellGroups: 'lockedCellGroups' in storedGame.state ? storedGame.state.lockedCellGroups : [],
    markers: 'markers' in storedGame.state && Array.isArray(storedGame.state.markers)
      ? storedGame.state.markers
      : 'markedCellKeys' in storedGame.state && Array.isArray(storedGame.state.markedCellKeys)
        ? storedGame.state.markedCellKeys.map((cellKey: string) => ({ cellKey, color: 'black' as const }))
        : [],
    moveCount: 'moveCount' in storedGame.state && typeof storedGame.state.moveCount === 'number' ? storedGame.state.moveCount : 0,
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
