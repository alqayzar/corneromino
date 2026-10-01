import { useEffect, useState } from 'react'
import { TETROMINOES, TETROMINO_KINDS, type TetrominoRotation } from '@/game/tetrominoes'
import { cn } from '@/lib/utils'

const HORIZONTAL_POSITIONS = [
  'top-[4%]',
  'top-[18%]',
  'top-[32%]',
  'top-[46%]',
  'top-[60%]',
  'top-[74%]',
  'top-[88%]',
] as const

const VERTICAL_POSITIONS = [
  'left-[3%]',
  'left-[17%]',
  'left-[31%]',
  'left-[45%]',
  'left-[59%]',
  'left-[73%]',
  'left-[87%]',
] as const

const INITIAL_DECORATION_COUNT = 10
const SPAWN_INTERVAL_MS = 1_500

interface Motion {
  className: string
  lifetimeMs: number
  positionClasses: readonly string[]
  startClass: string
}

const MOTIONS: readonly Motion[] = [
  { className: 'animate-tetromino-drift-right-fast', lifetimeMs: 16_000, positionClasses: HORIZONTAL_POSITIONS, startClass: 'left-[-110px]' },
  { className: 'animate-tetromino-drift-right-slow', lifetimeMs: 24_000, positionClasses: HORIZONTAL_POSITIONS, startClass: 'left-[-110px]' },
  { className: 'animate-tetromino-drift-left-fast', lifetimeMs: 16_000, positionClasses: HORIZONTAL_POSITIONS, startClass: 'right-[-110px]' },
  { className: 'animate-tetromino-drift-left-slow', lifetimeMs: 24_000, positionClasses: HORIZONTAL_POSITIONS, startClass: 'right-[-110px]' },
  { className: 'animate-tetromino-drift-down-fast', lifetimeMs: 16_000, positionClasses: VERTICAL_POSITIONS, startClass: 'top-[-110px]' },
  { className: 'animate-tetromino-drift-down-slow', lifetimeMs: 24_000, positionClasses: VERTICAL_POSITIONS, startClass: 'top-[-110px]' },
  { className: 'animate-tetromino-drift-up-fast', lifetimeMs: 16_000, positionClasses: VERTICAL_POSITIONS, startClass: 'bottom-[-110px]' },
  { className: 'animate-tetromino-drift-up-slow', lifetimeMs: 24_000, positionClasses: VERTICAL_POSITIONS, startClass: 'bottom-[-110px]' },
]

interface MovingDecoration {
  createdAt: number
  id: string
  motionClass: string
  lifetimeMs: number
  positionClass: string
  rotation: TetrominoRotation
  startClass: string
}

function getRandomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function createDecoration(): MovingDecoration {
  const kind = getRandomItem(TETROMINO_KINDS)
  const motion = getRandomItem(MOTIONS)

  return {
    createdAt: Date.now(),
    id: crypto.randomUUID(),
    motionClass: motion.className,
    lifetimeMs: motion.lifetimeMs,
    positionClass: getRandomItem(motion.positionClasses),
    rotation: getRandomItem(TETROMINOES[kind].rotations),
    startClass: motion.startClass,
  }
}

function createInitialDecorations(): MovingDecoration[] {
  return Array.from({ length: INITIAL_DECORATION_COUNT }, createDecoration)
}

export function TetrominoBackground() {
  const [decorations, setDecorations] = useState(createInitialDecorations)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      setDecorations((currentDecorations) => [
        ...currentDecorations.filter((decoration) => now - decoration.createdAt < decoration.lifetimeMs),
        createDecoration(),
      ])
    }, SPAWN_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.2]">
      {decorations.map(({ id, motionClass, positionClass, rotation, startClass }) => (
        <div className={cn('tetromino-motion absolute inline-grid grid-cols-4 grid-rows-4 gap-0.5', motionClass, positionClass, startClass)} key={id}>
          {rotation.cells.map((cell) => (
            <span
              className={cn(
                'size-[22px] border-2 border-[var(--outline-color)] bg-[var(--paper)]',
              )}
              key={cell.id}
              style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
