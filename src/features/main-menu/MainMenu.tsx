import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { TetrominoBackground } from '@/components/TetrominoBackground'

export function MainMenu() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[var(--canvas)] px-5 py-8 text-[var(--canvas-foreground)]">
      <TetrominoBackground />
      <section className="relative z-10 flex w-full max-w-[380px] flex-col items-center gap-4 text-center">
        <h1 className="mb-4 text-[55px] leading-none font-black tracking-[-0.055em] sm:text-[66px]">
          Cornermino
        </h1>
        <Button
          asChild
          className="cartoon-press h-[66px] w-full rounded-2xl border-[var(--outline-color)] [--element-color:var(--mint)] text-[22px] font-black tracking-[0.05em] text-[var(--text-color)] uppercase hover:bg-[#95e7df]"
          size="lg"
        >
          <Link to="/play">Play</Link>
        </Button>
        <Button
          asChild
          className="cartoon-press h-[66px] w-full rounded-2xl border-[var(--outline-color)] [--element-color:var(--mint)] text-[22px] font-black tracking-[0.05em] text-[var(--text-color)] uppercase hover:bg-[#95e7df]"
          size="lg"
        >
          <Link to="/list">Tetrominos</Link>
        </Button>
      </section>
    </main>
  )
}
