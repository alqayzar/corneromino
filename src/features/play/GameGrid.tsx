import { useEffect, useState } from 'react'
import { Check, ListChecks, Lock, Unlock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CellCorner, GameConfig, GameMode, LockedCellGroup, PlacedTetromino, PlacedTetrominoCell } from '@/game/gameConfig'
import { isTetrominoShape } from '@/game/tetrominoes'
import { loadGameSelection, saveGameSelection } from '@/lib/db'
import { cn } from '@/lib/utils'

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
  'bg-[var(--mint)]',
  'bg-[var(--coral)]',
  'bg-[var(--surface-shadow)]',
  'bg-[var(--yellow)]',
  'bg-[var(--olive)]',
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

function CornerMarker(props: { corner: CellCorner }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute size-1/2 rounded-[10%] bg-[var(--outline-color)]',
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
        'relative flex aspect-square items-center justify-center rounded-[5%] border-2 border-[var(--outline-color)] bg-[var(--paper-muted)] p-0 text-[11px] font-bold text-[var(--text-color)] transition-[background-color,box-shadow] duration-150',
        props.lockedColor,
        props.selected && 'z-10 ring-2 ring-[var(--coral)] ring-inset',
        props.selected && !props.lockedColor && 'bg-[#fff0f4]',
        props.className,
      )}
      onClick={toggleSelection}
      type="button"
    >
      {props.showId && props.piece && <span className="relative z-10 text-[#ffd23f] [-webkit-text-stroke:1px_var(--outline-color)]">#{props.piece.id}</span>}
      {props.cell && <CornerMarker corner={props.cell.corner} />}
    </button>
  )
}

export function GameGrid(props: GameGridProps) {
  const [showCellIds, setShowCellIds] = useState(false)
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(() => new Set())
  const [lockedCellGroups, setLockedCellGroups] = useState<LockedCellGroup[]>([])
  const [selectedLockedGroupId, setSelectedLockedGroupId] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [selectionLoaded, setSelectionLoaded] = useState(false)
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

  function toggleCellSelection(cellKey: string) {
    const lockedGroup = lockedCellMap.get(cellKey)
    if (lockedGroup) {
      setSelectedCellKeys(new Set())
      setSelectedLockedGroupId(lockedGroup.id)
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
    setSelectionLoaded(false)

    void loadGameSelection(props.gameMode, props.gameId)
      .then((storedSelection) => {
        if (active) {
          setLockedCellGroups(storedSelection.lockedCellGroups)
          setSelectedCellKeys(new Set(storedSelection.selectedCellKeys))
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
    if (!selectionLoaded) return
    void saveGameSelection(props.gameMode, props.gameId, {
      lockedCellGroups,
      selectedCellKeys: [...selectedCellKeys],
    }).catch(() => {
      // Selection remains available for the current session if IndexedDB is unavailable.
    })
  }, [lockedCellGroups, props.gameId, props.gameMode, selectedCellKeys, selectionLoaded])

  return (
    <div className="space-y-3 px-1">
      <section aria-label="Game board" className="element-shadow mx-auto w-full max-w-[550px] p-1 [--element-color:var(--paper)]">
        <div
          className="grid gap-0.5"
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
      <div className="mx-auto grid w-full max-w-[550px] grid-cols-[1fr_auto_auto_auto] gap-3">
        <Button
          className="cartoon-press h-[44px] [--element-color:var(--paper)] text-[11px] font-black text-[var(--text-color)] uppercase hover:bg-white"
          onClick={toggleCellIds}
          size="sm"
          type="button"
        >
          {showCellIds ? 'Hide IDs' : 'Show IDs'}
        </Button>
        <Button
          aria-label="Lock four selected cells"
          className="cartoon-press size-[44px] [--element-color:var(--mint)] text-[var(--text-color)] hover:bg-[#95e7df]"
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
          className="cartoon-press size-[44px] [--element-color:var(--paper)] text-[var(--text-color)] hover:bg-white"
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
            'cartoon-press relative size-[44px] text-[var(--text-color)]',
            validationResult?.isCorrect && '[--element-color:var(--mint)] hover:bg-[#95e7df]',
            validationResult && !validationResult.isCorrect && '[--element-color:var(--coral)] hover:bg-[#ff7885]',
            !validationResult && '[--element-color:var(--paper)] hover:bg-white',
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
              <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border-2 border-[var(--outline-color)] bg-[#ffd23f] text-[10px] font-black">
                {validationResult.validLockCount}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
