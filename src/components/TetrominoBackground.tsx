import { TETROMINOES, TETROMINO_KINDS, type TetrominoRotation } from '@/game/tetrominoes'
import { cn } from '@/lib/utils'

const DECORATION_POSITION_OPTIONS = [
  'left-[2%] top-[3%]',
  'left-[19%] top-[11%]',
  'left-[38%] top-[4%]',
  'left-[57%] top-[16%]',
  'left-[79%] top-[5%]',
  'right-[2%] top-[26%]',
  'left-[5%] top-[29%]',
  'left-[27%] top-[35%]',
  'left-[48%] top-[28%]',
  'left-[68%] top-[40%]',
  'right-[8%] top-[49%]',
  'left-[1%] top-[55%]',
  'left-[20%] top-[61%]',
  'left-[41%] top-[53%]',
  'left-[61%] top-[66%]',
  'right-[3%] top-[72%]',
  'bottom-[4%] left-[5%]',
  'bottom-[13%] left-[26%]',
  'bottom-[4%] left-[47%]',
  'bottom-[16%] right-[27%]',
  'bottom-[5%] right-[6%]',
] as const

const DECORATION_COLORS = ['bg-[var(--paper)]'] as const
const GRID_COLUMN_START_CLASSES = { 0: 'col-start-1', 1: 'col-start-2', 2: 'col-start-3', 3: 'col-start-4' } as const
const GRID_ROW_START_CLASSES = { 0: 'row-start-1', 1: 'row-start-2', 2: 'row-start-3', 3: 'row-start-4' } as const
const DECORATION_COUNT = 16

interface Decoration {
  colorClass: (typeof DECORATION_COLORS)[number]
  id: string
  positionClass: string
  rotation: TetrominoRotation
}

function getRandomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle<T>(items: readonly T[]): T[] {
  const shuffledItems = [...items]

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]]
  }

  return shuffledItems
}

const DECORATION_POSITIONS = shuffle(DECORATION_POSITION_OPTIONS).slice(0, DECORATION_COUNT)

const DECORATIONS: readonly Decoration[] = DECORATION_POSITIONS.map((positionClass, index) => {
  const kind = getRandomItem(TETROMINO_KINDS)

  return {
    colorClass: getRandomItem(DECORATION_COLORS),
    id: `decoration-${index + 1}`,
    positionClass,
    rotation: getRandomItem(TETROMINOES[kind].rotations),
  }
})

export function TetrominoBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.2]">
      {DECORATIONS.map(({ colorClass, id, positionClass, rotation }) => (
        <div className={cn('absolute inline-grid grid-cols-4 grid-rows-4 gap-0.5', positionClass)} key={id}>
          {rotation.cells.map((cell) => (
            <span
              className={cn(
                'size-[22px] border-2 border-[var(--outline-color)]',
                colorClass,
                GRID_COLUMN_START_CLASSES[cell.x as 0 | 1 | 2 | 3],
                GRID_ROW_START_CLASSES[cell.y as 0 | 1 | 2 | 3],
              )}
              key={cell.id}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
