import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CellCorner, GameConfig, GameMode, PlacedTetromino, PlacedTetrominoCell } from '@/game/placement'
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

function createCellMap(pieces: readonly PlacedTetromino[]): Map<string, PlacedTetromino> {
  return new Map(pieces.flatMap((piece) => piece.cells.map((cell) => [`${cell.x},${cell.y}`, piece])))
}

interface GameGridCellProps {
  cell: PlacedTetrominoCell | undefined
  className?: string
  piece: PlacedTetromino | undefined
  selected: boolean
  showId: boolean
  x: number
  y: number
  onToggle?: (cellKey: string) => void
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
  const cellClasses = cn(
    'relative flex items-center justify-center rounded-[5%] border-2 border-[var(--outline-color)] bg-[var(--paper-muted)] text-[11px] font-bold text-[var(--text-color)]',
    props.selected && 'ring-6 ring-[var(--coral)] ring-inset',
    props.className,
  )

  function toggleSelection() {
    props.onToggle?.(cellKey)
  }


  if (!props.onToggle) {
    return (
      <div className={cellClasses}>
        {props.showId && props.piece && <span className="relative z-10 text-[#ffd23f] [-webkit-text-stroke:1px_var(--outline-color)]">#{props.piece.id}</span>}
        {props.cell && <CornerMarker corner={props.cell.corner} />}
      </div>
    )
  }

  return (
    <button
      aria-label={`Cell ${props.x + 1}, ${props.y + 1}`}
      aria-pressed={props.selected}
      className={cn(cellClasses, 'aspect-square p-0')}
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
  const [selectionLoaded, setSelectionLoaded] = useState(false)
  const cellMap = createCellMap(props.pieces)
  const boardCells = Array.from({ length: props.config.columns * props.config.rows }, (_, index) => ({
    x: index % props.config.columns,
    y: Math.floor(index / props.config.columns),
  }))
  function toggleCellIds() {
    setShowCellIds((visible) => !visible)
  }

  function toggleCellSelection(cellKey: string) {
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

  useEffect(() => {
    let active = true
    setSelectedCellKeys(new Set())
    setSelectionLoaded(false)

    void loadGameSelection(props.gameMode, props.gameId)
      .then((storedCellKeys) => {
        if (active) {
          setSelectedCellKeys(new Set(storedCellKeys))
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
    void saveGameSelection(props.gameMode, props.gameId, selectedCellKeys).catch(() => {
      // Selection remains available for the current session if IndexedDB is unavailable.
    })
  }, [props.gameId, props.gameMode, selectedCellKeys, selectionLoaded])

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
            return (
              <GameGridCell
                cell={cell}
                key={`${x},${y}`}
                onToggle={toggleCellSelection}
                piece={piece}
                selected={selectedCellKeys.has(cellKey)}
                showId={showCellIds}
                x={x}
                y={y}
              />
            )
          })}
        </div>
      </section>
      <Button
        className="cartoon-press mx-auto flex h-[44px] w-full max-w-[550px] [--element-color:var(--paper)] text-[11px] font-black text-[var(--text-color)] uppercase hover:bg-white"
        onClick={toggleCellIds}
        size="sm"
        type="button"
      >
        {showCellIds ? 'Hide IDs' : 'Show IDs'}
      </Button>
    </div>
  )
}
