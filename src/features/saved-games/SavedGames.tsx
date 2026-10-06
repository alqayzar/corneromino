import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { deleteSavedGame, type SavedGame, loadSavedGames } from '@/lib/db'

function formatSeed(seed: string): string {
  return seed.length > 14 ? `${seed.slice(0, 7)}…${seed.slice(-5)}` : seed
}

function formatSavedAt(savedAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(savedAt)
}

function SavedGameCard(props: { game: SavedGame; onDelete: (game: SavedGame) => void }) {
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const gamePath = `/play?mode=${props.game.gameMode}&seed=${encodeURIComponent(props.game.gameId)}`

  function deleteGame() {
    props.onDelete(props.game)
  }

  useEffect(() => {
    const nextScreenshotUrl = URL.createObjectURL(props.game.screenshot)
    setScreenshotUrl(nextScreenshotUrl)

    return () => {
      URL.revokeObjectURL(nextScreenshotUrl)
    }
  }, [props.game.screenshot])

  return (
    <article className="saved-game-card flex gap-3 p-2 text-[var(--canvas-foreground)]">
      <Link
        aria-label={`Continue ${props.game.gameMode} game saved ${formatSavedAt(props.game.savedAt)}`}
        className="shrink-0 self-start"
        to={gamePath}
      >
        {screenshotUrl && <img alt="Saved game board" className="h-auto w-28 shrink-0 self-start" src={screenshotUrl} />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <Link className="block" to={gamePath}>
          <div>
            <p className="poster-kicker text-[9px] text-[var(--muted-text-color)]">{formatSavedAt(props.game.savedAt)}</p>
            <h2 className="mt-1 text-[15px] font-black uppercase">{props.game.gameMode}</h2>
          </div>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <Link className="min-w-0 flex-1" title={props.game.gameId} to={gamePath}>
            <p className="poster-kicker truncate text-[9px] text-[var(--muted-text-color)]">
            {formatSeed(props.game.gameId)}
            </p>
          </Link>
          <Button
            aria-label={`Delete ${props.game.gameMode} saved game`}
            className="cartoon-press size-9 shrink-0 text-[var(--coral)]"
            onClick={deleteGame}
            size="icon"
            title="Delete saved game"
            type="button"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  )
}

export function SavedGames() {
  const [savedGames, setSavedGames] = useState<SavedGame[]>([])
  const [loading, setLoading] = useState(true)

  async function deleteGame(game: SavedGame) {
    await deleteSavedGame(game.gameMode, game.gameId)
    setSavedGames((games) => games.filter((savedGame) => savedGame.gameId !== game.gameId || savedGame.gameMode !== game.gameMode))
  }

  useEffect(() => {
    let active = true

    void loadSavedGames()
      .then((games) => {
        if (active) setSavedGames(games)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="poster-page relative flex h-dvh overflow-hidden px-5 py-8 text-[var(--canvas-foreground)]">
      <section className="relative z-10 mx-auto flex min-h-0 w-full max-w-[720px] flex-col">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="poster-kicker text-[10px] text-[var(--muted-text-color)]">Corneromino</p>
            <h1 className="poster-title mt-2 whitespace-nowrap text-[29px] leading-none min-[375px]:text-[36px]">Saved games</h1>
          </div>
          <Button asChild className="cartoon-press size-[42px] shrink-0 text-[var(--canvas-foreground)]" size="icon" title="Back to modes">
            <Link aria-label="Back to modes" to="/play"><ArrowLeft aria-hidden="true" /></Link>
          </Button>
        </div>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && <p className="poster-kicker mt-2 text-center text-[10px] text-[var(--muted-text-color)]">Loading saved games…</p>}
          {!loading && savedGames.length === 0 && (
            <p className="poster-kicker mt-2 text-center text-[10px] text-[var(--muted-text-color)]">No saved games yet</p>
          )}
          {!loading && savedGames.length > 0 && (
            <div className="grid gap-4 pb-1 sm:grid-cols-2">
              {savedGames.map((game) => <SavedGameCard game={game} key={`${game.gameMode}:${game.gameId}`} onDelete={deleteGame} />)}
            </div>
          )}
          </div>
      </section>
    </main>
  )
}
