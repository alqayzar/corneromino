import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { GameConfig, PlacedTetromino, PlacedTetrominoCell } from '@/game/placement'
import { loadGameSelection, saveGameSelection } from '@/lib/db'
import { cn } from '@/lib/utils'

interface GameGridProps {
  config: GameConfig
  gameId: string
  pieces: readonly PlacedTetromino[]
}

const CORNER_POSITION_CLASSES = {
  'top-left': 'left-1 top-1',
  'top-right': 'right-1 top-1',
  'bottom-right': 'bottom-1 right-1',
  'bottom-left': 'bottom-1 left-1',
} as const

const GRID_COLUMN_CLASSES: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
  13: 'grid-cols-13',
  14: 'grid-cols-14',
  15: 'grid-cols-15',
  16: 'grid-cols-16',
}

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

export function GameGridCell({ cell, className, piece, selected, showId, x, y, onToggle }: GameGridCellProps) {
  const cellKey = `${x},${y}`
  const cellClasses = cn(
    'relative flex items-center justify-center border-2 border-[var(--outline-color)] bg-[var(--paper-muted)] text-[11px] font-bold text-[var(--text-color)]',
    selected && 'ring-6 ring-[var(--coral)]',
    className,
  )

  function toggleSelection() {
    onToggle?.(cellKey)
  }

  if (!onToggle) {
    return (
      <div className={cellClasses}>
        {showId && piece ? `#${piece.id}` : ''}
        {cell && <span aria-hidden="true" className={`absolute size-2 rounded-sm bg-[var(--outline-color)] ${CORNER_POSITION_CLASSES[cell.corner]}`} />}
      </div>
    )
  }

  return (
    <button
      aria-label={`Cell ${x + 1}, ${y + 1}`}
      aria-pressed={selected}
      className={cn(cellClasses, 'aspect-square p-0')}
      onClick={toggleSelection}
      type="button"
    >
      {showId && piece ? `#${piece.id}` : ''}
      {cell && <span aria-hidden="true" className={`absolute size-2 rounded-sm bg-[var(--outline-color)] ${CORNER_POSITION_CLASSES[cell.corner]}`} />}
    </button>
  )
}

export function GameGrid({ config, gameId, pieces }: GameGridProps) {
  const [showCellIds, setShowCellIds] = useState(false)
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(() => new Set())
  const [selectionLoaded, setSelectionLoaded] = useState(false)
  const cellMap = createCellMap(pieces)
  const boardCells = Array.from({ length: config.columns * config.rows }, (_, index) => ({
    x: index % config.columns,
    y: Math.floor(index / config.columns),
  }))
  const gridColumnClass = GRID_COLUMN_CLASSES[config.columns]

  if (!gridColumnClass) {
    throw new Error(`Unsupported board width: ${config.columns}. Add a matching Tailwind grid class.`)
  }

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

    void loadGameSelection(gameId)
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
  }, [gameId])

  useEffect(() => {
    if (!selectionLoaded) return
    void saveGameSelection(gameId, selectedCellKeys).catch(() => {
      // Selection remains available for the current session if IndexedDB is unavailable.
    })
  }, [gameId, selectedCellKeys, selectionLoaded])

  return (
    <div className="space-y-3 px-1">
      <section aria-label="Game board" className="element-shadow mx-auto w-full max-w-[550px] p-1 [--element-color:var(--paper)]">
        <div className={cn('grid gap-0.5', gridColumnClass)}>
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
