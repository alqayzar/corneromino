import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { TetrominoBackground } from '@/components/TetrominoBackground'
import { TETROMINOES, TETROMINO_KINDS, type TetrominoRotation } from '@/game/tetrominoes'
import { cn } from '@/lib/utils'

const CELL_COLOR_CLASSES = {
  a: 'bg-[var(--mint)]',
  b: 'bg-[#d39aff]',
  c: 'bg-[var(--coral)]',
  d: 'bg-[var(--paper)]',
} as const

const GRID_COLUMN_CLASSES = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const
const GRID_ROW_CLASSES = { 1: 'grid-rows-1', 2: 'grid-rows-2', 3: 'grid-rows-3', 4: 'grid-rows-4' } as const
const GRID_COLUMN_START_CLASSES = { 0: 'col-start-1', 1: 'col-start-2', 2: 'col-start-3', 3: 'col-start-4' } as const
const GRID_ROW_START_CLASSES = { 0: 'row-start-1', 1: 'row-start-2', 2: 'row-start-3', 3: 'row-start-4' } as const

function TetrominoPreview({ rotation }: { rotation: TetrominoRotation }) {
  const width = Math.max(...rotation.cells.map((cell) => cell.x)) + 1
  const height = Math.max(...rotation.cells.map((cell) => cell.y)) + 1

  return (
    <div aria-label={`Rotation ${rotation.turns * 90} degrees`} className={cn('inline-grid gap-0.5', GRID_COLUMN_CLASSES[width as 1 | 2 | 3 | 4], GRID_ROW_CLASSES[height as 1 | 2 | 3 | 4])} role="img">
      {rotation.cells.map((cell) => (
        <span
          className={cn(
            'size-[22px] border-2 border-[var(--outline-color)]',
            CELL_COLOR_CLASSES[cell.id],
            GRID_COLUMN_START_CLASSES[cell.x as 0 | 1 | 2 | 3],
            GRID_ROW_START_CLASSES[cell.y as 0 | 1 | 2 | 3],
          )}
          key={cell.id}
        />
      ))}
    </div>
  )
}

export function TetrominoList() {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-[var(--canvas)] px-5 py-8 text-[var(--canvas-foreground)]">
      <TetrominoBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-[600px] items-center justify-between gap-4 pb-6">
        <h1 className="text-[33px] leading-none font-black tracking-[-0.055em]">Tetrominos</h1>
        <Button asChild className="cartoon-press h-[44px] px-4 [--element-color:var(--mint)] text-[11px] font-black text-[var(--text-color)] uppercase hover:bg-[#95e7df]" size="sm">
          <Link to="/">Back</Link>
        </Button>
      </header>

      <section aria-label="Tetromino catalog" className="relative z-10 mx-auto min-h-0 w-full max-w-[600px] flex-1 overflow-y-auto pr-1">
        <div className="space-y-4 pb-8">
          {TETROMINO_KINDS.map((kind) => (
            <article className="element-shadow p-4 text-[var(--text-color)]" key={kind}>
              <h2 className="text-[22px] leading-none font-bold uppercase">{kind}</h2>
              <div className="mt-4 flex flex-wrap items-end gap-5">
                {TETROMINOES[kind].rotations.map((rotation) => (
                  <div className="flex flex-col items-center gap-2" key={rotation.turns}>
                    <TetrominoPreview rotation={rotation} />
                    <span className="text-[11px] leading-none">{rotation.turns * 90}°</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
