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

function TetrominoPreview(props: { rotation: TetrominoRotation }) {
  const width = Math.max(...props.rotation.cells.map((cell) => cell.x)) + 1
  const height = Math.max(...props.rotation.cells.map((cell) => cell.y)) + 1

  return (
    <div
      aria-label={`Rotation ${props.rotation.turns * 90} degrees`}
      className="inline-grid gap-0.5"
      role="img"
      style={{
        gridTemplateColumns: `repeat(${width}, 22px)`,
        gridTemplateRows: `repeat(${height}, 22px)`,
      }}
    >
      {props.rotation.cells.map((cell) => (
        <span
          className={cn(
            'size-[22px] border-2 border-[var(--outline-color)]',
            CELL_COLOR_CLASSES[cell.id],
          )}
          key={cell.id}
          style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
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
