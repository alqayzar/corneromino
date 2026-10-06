import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function MainMenu() {
  return (
    <main className="poster-page relative grid min-h-dvh place-items-center overflow-hidden px-5 py-8 text-[var(--canvas-foreground)]">
      <section className="relative z-10 flex w-full max-w-[430px] flex-col items-center gap-5 text-center">
        <p className="poster-kicker text-[10px] text-[var(--muted-text-color)]">A spatial deduction game</p>
        <h1 className="poster-title text-[50px] leading-[0.8] min-[375px]:text-[68px] sm:text-[82px]">
          Corneromino
        </h1>
        <Button
          asChild
          className="cartoon-press h-[64px] w-full text-[15px] font-black tracking-[0.2em] text-[var(--canvas-foreground)] uppercase"
          size="lg"
        >
          <Link to="/play">Play</Link>
        </Button>
        <p className="poster-kicker text-[9px] text-[var(--muted-text-color)]">Find the hidden forms</p>
      </section>
    </main>
  )
}
