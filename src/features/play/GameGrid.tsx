import { useEffect, useRef, useState } from 'react'
import { Check, Eraser, Eye, ListChecks, Lock, LogOut, Unlock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { CellCorner, GameConfig, GameMode, LockedCellGroup, PlacedTetromino, PlacedTetrominoCell } from '@/game/gameConfig'
import { isTetrominoShape } from '@/game/tetrominoes'
import { clearGameSelection, loadGameSelection, saveGameSelection } from '@/lib/db'
import { cn } from '@/lib/utils'
import { SaveGameDialog } from './SaveGameDialog'

interface GameGridProps {
  config: GameConfig
  gameId: string
  gameMode: GameMode
  pieces: readonly PlacedTetromino[]
}

const CORNER_POSITION_CLASSES = {
  'top-left': 'left-[7%] top-[7%]',
  'top-right': 'right-[7%] top-[7%]',
  'bottom-right': 'bottom-[7%] right-[7%]',
  'bottom-left': 'bottom-[7%] left-[7%]',
} as const

const LOCKED_CELL_COLORS = [
  'bg-[#55c7df]',
  'bg-[#8270d8]',
  'bg-[#be69d6]',
  'bg-[#de5d9b]',
  'bg-[#e4555c]',
  'bg-[#5fc47a]',
  'bg-[#4db9a7]',
  'bg-[#73a9ee]',
  'bg-[#9d71dc]',
] as const

function createCellMap(pieces: readonly PlacedTetromino[]): Map<string, PlacedTetromino> {
  return new Map(pieces.flatMap((piece) => piece.cells.map((cell) => [`${cell.x},${cell.y}`, piece])))
}

function createLockedCellMap(groups: readonly LockedCellGroup[]): Map<string, LockedCellGroup> {
  return new Map(groups.flatMap((group) => group.cellKeys.map((cellKey) => [cellKey, group])))
}

function parseCellKeys(cellKeys: Iterable<string>) {
  return [...cellKeys].map((cellKey) => {
    const [x, y] = cellKey.split(',').map(Number)
    return { x, y }
  })
}

interface GameGridCellProps {
  cell: PlacedTetrominoCell | undefined
  className?: string
  lockedColor: string | undefined
  piece: PlacedTetromino | undefined
  selected: boolean
  showId: boolean
  x: number
  y: number
  onToggle: (cellKey: string) => void
}

interface ValidationResult {
  isCorrect: boolean
  validLockCount: number
}

function CornerMarker(props: { backgroundClass: string; corner: CellCorner }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute w-1/2 aspect-square rounded-[10%]',
        props.backgroundClass,
        CORNER_POSITION_CLASSES[props.corner],
      )}
    />
  )
}

export function GameGridCell(props: GameGridCellProps) {
  const cellKey = `${props.x},${props.y}`

  function toggleSelection() {
    props.onToggle(cellKey)
  }

  return (
    <button
      aria-label={`Cell ${props.x + 1}, ${props.y + 1}`}
      aria-pressed={props.selected}
      className={cn(
        'border-[#773526] border-2',
        'relative flex aspect-square items-center justify-center rounded-[2%] bg-[#ffd18a] p-0 text-[11px] font-bold text-[var(--canvas-foreground)] transition-transform duration-150',
        props.lockedColor,
        props.selected && props.cell && 'z-10 -translate-y-[20%] rotate-2 bg-[#773526] border-[#ffd18a] scale-90',
        props.className,
      )}
      disabled={!props.cell}
      onClick={toggleSelection}
      type="button"
    >
      {props.showId && props.piece && <span className="relative z-10 text-[var(--canvas-foreground)] [text-shadow:0_0_7px_var(--coral)]">#{props.piece.id}</span>}
      {props.cell && (
        <CornerMarker
          backgroundClass={props.selected ? "bg-[#ffd18a]" : "bg-[var(--outline-color)]"}
          corner={props.cell.corner}
        />
      )}
    </button>
  )
}

export function GameGrid(props: GameGridProps) {
  const navigate = useNavigate()
  const [showCellIds, setShowCellIds] = useState(false)
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(() => new Set())
  const [lockedCellGroups, setLockedCellGroups] = useState<LockedCellGroup[]>([])
  const [selectedLockedGroupId, setSelectedLockedGroupId] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [selectionLoaded, setSelectionLoaded] = useState(false)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [gameGridScreenshot, setGameGridScreenshot] = useState<Blob | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const gameBoardRef = useRef<HTMLElement>(null)
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve())
  const cellMap = createCellMap(props.pieces)
  const lockedCellMap = createLockedCellMap(lockedCellGroups)
  const boardCells = Array.from({ length: props.config.columns * props.config.rows }, (_, index) => ({
    x: index % props.config.columns,
    y: Math.floor(index / props.config.columns),
  }))
  const canLockSelectedCells = selectedCellKeys.size === 4 && isTetrominoShape(parseCellKeys(selectedCellKeys))
  const canValidate = cellMap.size > 0 && [...cellMap.keys()].every((cellKey) => lockedCellMap.has(cellKey))
  function toggleCellIds() {
    setShowCellIds((visible) => !visible)
  }

  function clearSelectedCells() {
    setSelectedCellKeys(new Set())
    setSelectedLockedGroupId(null)
    setValidationResult(null)
  }

  function queuePersistence(task: () => Promise<void>): Promise<void> {
    const queuedTask = persistenceQueueRef.current.catch(() => undefined).then(task)
    persistenceQueueRef.current = queuedTask
    return queuedTask
  }

  function requestExit() {
    setExitDialogOpen(true)
  }

  async function captureGameGridScreenshot(): Promise<Blob | null> {
    if (!gameBoardRef.current) return null

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(gameBoardRef.current, {
      backgroundColor: null,
      scale: 2,
    })

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
  }

  async function exitGame(saveGame: boolean) {
    setIsExiting(true)

    try {
      if (saveGame) {
        const screenshot = (await captureGameGridScreenshot()) ?? gameGridScreenshot
        const nextSavedAt = Date.now()
        setGameGridScreenshot(screenshot)
        setSavedAt(nextSavedAt)
        await queuePersistence(() => saveGameSelection(props.gameMode, props.gameId, {
          gameGridScreenshot: screenshot,
          lockedCellGroups,
          savedAt: nextSavedAt,
          selectedCellKeys: [...selectedCellKeys],
        }))
      } else {
        await persistenceQueueRef.current.catch(() => undefined)
        await clearGameSelection(props.gameMode, props.gameId)
      }
    } finally {
      navigate('/play')
    }
  }

  function discardAndExit() {
    void exitGame(false)
  }

  function saveAndExit() {
    void exitGame(true)
  }

  function toggleCellSelection(cellKey: string) {
    if (!cellMap.has(cellKey)) return

    const lockedGroup = lockedCellMap.get(cellKey)
    if (lockedGroup) {
      setSelectedCellKeys(new Set())
      setSelectedLockedGroupId((selectedGroupId) => (selectedGroupId === lockedGroup.id ? null : lockedGroup.id))
      return
    }

    setSelectedLockedGroupId(null)
    setValidationResult(null)
    setSelectedCellKeys((selectedCells) => {
      const nextSelectedCells = new Set(selectedCells)
      if (nextSelectedCells.has(cellKey)) {
        nextSelectedCells.delete(cellKey)
      } else {
        nextSelectedCells.add(cellKey)
      }
      return nextSelectedCells
    })
  }

  function lockSelectedCells() {
    if (!canLockSelectedCells) return

    const cellKeys = [...selectedCellKeys]
    const color = LOCKED_CELL_COLORS[Math.floor(Math.random() * LOCKED_CELL_COLORS.length)]
    setLockedCellGroups((groups) => [...groups, { cellKeys, color, id: crypto.randomUUID() }])
    setSelectedCellKeys(new Set())
    setValidationResult(null)
  }

  function unlockSelectedCells() {
    if (!selectedLockedGroupId) return

    const group = lockedCellGroups.find((lockedGroup) => lockedGroup.id === selectedLockedGroupId)
    if (!group) return

    setLockedCellGroups((groups) => groups.filter((lockedGroup) => lockedGroup.id !== group.id))
    setSelectedCellKeys(new Set(group.cellKeys))
    setSelectedLockedGroupId(null)
    setValidationResult(null)
  }

  function validateLockedCells() {
    if (!canValidate) return

    const validLockCount = lockedCellGroups.filter((group) => {
      const corners = group.cellKeys.map((cellKey) => {
        const piece = cellMap.get(cellKey)
        const [x, y] = cellKey.split(',').map(Number)
        return piece?.cells.find((cell) => cell.x === x && cell.y === y)?.corner
      })
      return corners.length === 4 && corners.every((corner) => corner !== undefined) && new Set(corners).size === 4
    }).length

    setValidationResult({
      isCorrect: validLockCount === lockedCellGroups.length,
      validLockCount,
    })
  }

  useEffect(() => {
    let active = true
    setSelectedCellKeys(new Set())
    setLockedCellGroups([])
    setSelectedLockedGroupId(null)
    setValidationResult(null)
    setGameGridScreenshot(null)
    setSavedAt(null)
    setSelectionLoaded(false)

    void loadGameSelection(props.gameMode, props.gameId)
      .then((storedSelection) => {
        if (active) {
          setLockedCellGroups(storedSelection.lockedCellGroups)
          setSelectedCellKeys(new Set(storedSelection.selectedCellKeys))
          setGameGridScreenshot(storedSelection.gameGridScreenshot)
          setSavedAt(storedSelection.savedAt)
        }
      })
      .catch(() => {
        // Selection remains available for the current session if IndexedDB is unavailable.
      })
      .finally(() => {
        if (active) {
          setSelectionLoaded(true)
        }
      })

    return () => {
      active = false
    }
  }, [props.gameId, props.gameMode])

  useEffect(() => {
    if (!selectionLoaded || isExiting) return
    void queuePersistence(() => saveGameSelection(props.gameMode, props.gameId, {
      gameGridScreenshot,
      lockedCellGroups,
      savedAt,
      selectedCellKeys: [...selectedCellKeys],
    })).catch(() => {
      // Selection remains available for the current session if IndexedDB is unavailable.
    })
  }, [gameGridScreenshot, isExiting, lockedCellGroups, props.gameId, props.gameMode, savedAt, selectedCellKeys, selectionLoaded])

  return (
    <div className="space-y-4 px-1">
      <section aria-label="Game board" className="mx-auto w-full max-w-[550px]" ref={gameBoardRef}>
        <div
          className="grid bg-[#773526] border-2 border-[#773526]"
          style={{ gridTemplateColumns: `repeat(${props.config.columns}, minmax(0, 1fr))` }}
        >
          {boardCells.map(({ x, y }) => {
            const cellKey = `${x},${y}`
            const piece = cellMap.get(cellKey)
            const cell = piece?.cells.find((pieceCell) => pieceCell.x === x && pieceCell.y === y)
            const lockedGroup = lockedCellMap.get(cellKey)
            return (
              <GameGridCell
                cell={cell}
                key={`${x},${y}`}
                lockedColor={lockedGroup?.color}
                onToggle={toggleCellSelection}
                piece={piece}
                selected={selectedCellKeys.has(cellKey) || lockedGroup?.id === selectedLockedGroupId}
                showId={showCellIds}
                x={x}
                y={y}
              />
            )
          })}
        </div>
      </section>
      <div className="mx-auto grid w-full max-w-[550px] grid-cols-[repeat(6,auto)] justify-center gap-2">
        <Button
          aria-label="Exit game"
          className="cartoon-press size-[44px] text-[var(--canvas-foreground)]"
          onClick={requestExit}
          size="icon"
          title="Exit game"
          type="button"
        >
          <LogOut aria-hidden="true" />
        </Button>
        <Button
          aria-label={showCellIds ? 'Hide tetromino IDs' : 'Show tetromino IDs'}
          aria-pressed={showCellIds}
          className="cartoon-press size-[44px] text-[var(--canvas-foreground)]"
          onClick={toggleCellIds}
          size="icon"
          title={showCellIds ? 'Hide tetromino IDs' : 'Show tetromino IDs'}
          type="button"
        >
          <Eye aria-hidden="true" />
        </Button>
        <Button
          aria-label="Deselect all cells"
          className="cartoon-press size-[44px] text-[var(--canvas-foreground)]"
          disabled={selectedCellKeys.size === 0 && !selectedLockedGroupId}
          onClick={clearSelectedCells}
          size="icon"
          title="Deselect all cells"
          type="button"
        >
          <Eraser aria-hidden="true" />
        </Button>
        <Button
          aria-label="Lock four selected cells"
          className="cartoon-press size-[44px] text-[var(--mint)]"
          disabled={!canLockSelectedCells}
          onClick={lockSelectedCells}
          size="icon"
          title="Lock four selected cells"
          type="button"
        >
          <Lock aria-hidden="true" />
        </Button>
        <Button
          aria-label="Unlock selected cells"
          className="cartoon-press size-[44px] [--element-color:var(--paper-muted)] text-[var(--canvas-foreground)]"
          disabled={!selectedLockedGroupId}
          onClick={unlockSelectedCells}
          size="icon"
          title="Unlock selected cells"
          type="button"
        >
          <Unlock aria-hidden="true" />
        </Button>
        <Button
          aria-label="Validate locked tetrominoes"
          className={cn(
            'cartoon-press relative size-[44px] text-[var(--canvas-foreground)]',
            validationResult?.isCorrect && 'text-[var(--mint)]',
            validationResult && !validationResult.isCorrect && 'text-[var(--coral)]',
          )}
          disabled={!canValidate}
          onClick={validateLockedCells}
          size="icon"
          title="Validate locked tetrominoes"
          type="button"
        >
          {!validationResult && <ListChecks aria-hidden="true" />}
          {validationResult?.isCorrect && <Check aria-hidden="true" />}
          {validationResult && !validationResult.isCorrect && (
            <>
              <X aria-hidden="true" />
              <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border border-[var(--canvas-foreground)] bg-[var(--yellow)] text-[10px] font-black text-[#030505]">
                {validationResult.validLockCount}
              </span>
            </>
          )}
        </Button>
      </div>
      <SaveGameDialog
        isSaving={isExiting}
        onDiscard={discardAndExit}
        onOpenChange={setExitDialogOpen}
        onSave={saveAndExit}
        open={exitDialogOpen}
      />
    </div>
  )
}
