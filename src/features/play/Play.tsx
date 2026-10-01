import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { TetrominoBackground } from '@/components/TetrominoBackground'
import { createRandomSeed, createSeededRandom, DEFAULT_GAME_CONFIG, generateTetrominoPlacements } from '@/game/placement'
import { clearGameSelection } from '@/lib/db'
import { GameGrid } from './GameGrid'

export function Play() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [generatedSeed] = useState(createRandomSeed)
  const seed = searchParams.get('seed') || generatedSeed
  const pieces = useMemo(
    () => generateTetrominoPlacements(DEFAULT_GAME_CONFIG, createSeededRandom(seed)),
    [seed],
  )

  useEffect(() => {
    if (!searchParams.get('seed')) {
      void clearGameSelection(generatedSeed)
      navigate(`/play?seed=${encodeURIComponent(generatedSeed)}`, { replace: true })
    }
  }, [generatedSeed, navigate, searchParams])

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--canvas)] py-5 text-[var(--canvas-foreground)]">
      <TetrominoBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-[550px] items-center justify-between gap-4 px-5 pb-6">
        <div className="min-w-0">
          <h1 className="text-[33px] leading-none font-black">Cornermino</h1>
          <p className="mt-2 max-w-64 truncate text-[11px] text-[var(--canvas-foreground)]/80">Seed: {seed}</p>
        </div>
        <Button asChild className="cartoon-press h-[44px] px-4 [--element-color:var(--paper)] text-[11px] font-black text-[var(--text-color)] uppercase hover:bg-white" size="sm">
          <Link to="/">Back</Link>
        </Button>
      </header>

      <div className="relative z-10">
        <GameGrid config={DEFAULT_GAME_CONFIG} gameId={seed} key={seed} pieces={pieces} />
      </div>
    </main>
  )
}
