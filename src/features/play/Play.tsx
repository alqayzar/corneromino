import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { TetrominoBackground } from '@/components/TetrominoBackground'
import { createRandomSeed, createSeededRandom } from '@/game/placement'
import { GAME_CONFIGS, isGameMode, type GameMode, type PlacedTetromino } from '@/game/gameConfig'
import { clearGameSelection } from '@/lib/db'
import { generateTetrominoPlacementsV2 } from '@/game/placementV2'
import { GameGrid } from './GameGrid'

const MODE_BUTTON_CLASS = 'cartoon-press h-[66px] w-full rounded-2xl border-[var(--outline-color)] [--element-color:var(--mint)] text-[22px] font-black tracking-[0.05em] text-[var(--text-color)] uppercase hover:bg-[#95e7df]'

interface GameSessionProps {
  gameMode: GameMode
  requestedSeed: string | null
}

function GameModeMenu() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[var(--canvas)] px-5 py-8 text-[var(--canvas-foreground)]">
      <TetrominoBackground />
      <section className="relative z-10 flex w-full max-w-[380px] flex-col items-center gap-4 text-center">
        <h1 className="mb-4 text-[33px] leading-none font-black min-[375px]:text-[44px]">Select mode</h1>
        <Button asChild className={MODE_BUTTON_CLASS} size="lg">
          <Link to="/play?mode=easy">Easy</Link>
        </Button>
        <Button asChild className={MODE_BUTTON_CLASS} size="lg">
          <Link to="/play?mode=medium">Medium</Link>
        </Button>
        <Button asChild className={MODE_BUTTON_CLASS} size="lg">
          <Link to="/play?mode=hard">Hard</Link>
        </Button>
        <Button asChild className="cartoon-press mt-2 h-[44px] w-full [--element-color:var(--paper)] text-[11px] font-black text-[var(--text-color)] uppercase hover:bg-white" size="sm">
          <Link to="/">Back</Link>
        </Button>
      </section>
    </main>
  )
}

function GameSession(props: GameSessionProps) {
  const navigate = useNavigate()
  const [generatedSeed] = useState(createRandomSeed)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [iterations, setIterations] = useState(0)
  const [pieces, setPieces] = useState<PlacedTetromino[] | null>(null)
  const seed = props.requestedSeed || generatedSeed
  const config = GAME_CONFIGS[props.gameMode]

  useEffect(() => {
    if (!props.requestedSeed) {
      void clearGameSelection(props.gameMode, generatedSeed)
      navigate(`/play?mode=${props.gameMode}&seed=${encodeURIComponent(generatedSeed)}`, { replace: true })
    }
  }, [generatedSeed, navigate, props.gameMode, props.requestedSeed])

  useEffect(() => {
    let active = true
    setGenerationError(null)
    setIterations(0)
    setPieces(null)

    void generateTetrominoPlacementsV2(config, {
      onProgress: (nextIterations) => {
        if (active) {
          setIterations(nextIterations)
        }
      },
      progressEvery: 10,
      random: createSeededRandom(`${props.gameMode}:${seed}`),
      yieldEvery: 250,
    })
      .then((generatedPieces) => {
        if (active) {
          setPieces(generatedPieces)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setGenerationError(error instanceof Error ? error.message : 'Could not generate this game.')
        }
      })

    return () => {
      active = false
    }
  }, [config, props.gameMode, seed])

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--canvas)] py-5 text-[var(--canvas-foreground)]">
      <TetrominoBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-[550px] items-center justify-between gap-4 px-5 pb-6">
        <div className="min-w-0">
          <h1 className="text-[33px] leading-none font-black">Corneromino</h1>
          <div className="mt-2 flex items-center gap-3 text-[11px] uppercase">
            <p>{props.gameMode}</p>
            <p>{iterations}</p>
          </div>
        </div>
        <Button asChild className="cartoon-press h-[44px] px-4 [--element-color:var(--paper)] text-[11px] font-black text-[var(--text-color)] uppercase hover:bg-white" size="sm">
          <Link to="/play">Back</Link>
        </Button>
      </header>

      <div className="relative z-10">
        {pieces && <GameGrid config={config} gameId={seed} gameMode={props.gameMode} key={`${props.gameMode}:${seed}`} pieces={pieces} />}
        {!pieces && !generationError && <p className="px-5 text-center text-[11px] font-bold uppercase">Generating game…</p>}
        {generationError && <p className="px-5 text-center text-[11px] font-bold text-[var(--coral)]" role="alert">{generationError}</p>}
      </div>
    </main>
  )
}

export function Play() {
  const [searchParams] = useSearchParams()
  const gameMode = searchParams.get('mode')

  if (!isGameMode(gameMode)) {
    return <GameModeMenu />
  }

  return <GameSession gameMode={gameMode} requestedSeed={searchParams.get('seed')} />
}
