import { useEffect, useRef, useState } from 'react'
import { LogOut, PenLine, Save, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { loadSandboxWorld, saveSandboxWorld, type SavedSandboxWorld } from '@/lib/db'
import { SandboxCanvas, type SandboxCanvasHandle } from './SandboxCanvas'

export function SandboxWorld() {
  const { worldId } = useParams()
  const canvasRef = useRef<SandboxCanvasHandle>(null)
  const [deleteEnabled, setDeleteEnabled] = useState(false)
  const [drawEnabled, setDrawEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedWorldId, setSavedWorldId] = useState<string | null>(null)
  const [worldName, setWorldName] = useState('')
  const [loadedWorld, setLoadedWorld] = useState<SavedSandboxWorld | null>(null)
  const [loadingWorld, setLoadingWorld] = useState(Boolean(worldId))

  useEffect(() => {
    let active = true

    if (!worldId) {
      setLoadedWorld(null)
      setLoadingWorld(false)
      setSavedWorldId(null)
      setWorldName('')
      return () => {
        active = false
      }
    }

    setLoadingWorld(true)
    setLoadedWorld(null)
    void loadSandboxWorld(worldId)
      .then((world) => {
        if (!active || !world) return
        setLoadedWorld(world)
        setSavedWorldId(world.id)
        setWorldName(world.name)
      })
      .finally(() => {
        if (active) setLoadingWorld(false)
      })

    return () => {
      active = false
    }
  }, [worldId])

  async function saveWorld() {
    const name = worldName.trim()
    if (!name || !canvasRef.current) return

    setIsSaving(true)
    setSaveError('')
    try {
      const { screenshot, state } = await canvasRef.current.captureWorld()
      const worldId = savedWorldId ?? crypto.randomUUID()
      await saveSandboxWorld({
        id: worldId,
        name,
        savedAt: Date.now(),
        screenshot,
        state,
      })
      setSavedWorldId(worldId)
      setSaveDialogOpen(false)
    } catch {
      setSaveError('Could not save this world.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="poster-page relative flex h-dvh flex-col overflow-hidden py-5 text-[var(--canvas-foreground)]">
      <header className="relative z-10 mx-auto w-full max-w-[550px] px-5 pb-6">
        <p className="poster-kicker text-[11px] text-[var(--muted-text-color)]">Corneromino</p>
        <h1 className="poster-title mt-2 text-[33px] leading-none">Sandbox</h1>
      </header>
      <section aria-label="Sandbox canvas" className="relative z-10 min-h-0 flex-1 bg-[#773526] border-[#773526] border-4 mx-1">
        {loadingWorld && <p className="poster-kicker p-5 text-center text-[11px] text-[var(--paper)]">Loading world…</p>}
        {!loadingWorld && (!worldId || loadedWorld) && (
          <SandboxCanvas
            deleteEnabled={deleteEnabled}
            drawEnabled={drawEnabled}
            initialState={loadedWorld?.state ?? null}
            key={worldId ?? 'new'}
            ref={canvasRef}
          />
        )}
        {!loadingWorld && worldId && !loadedWorld && <p className="poster-kicker p-5 text-center text-[11px] text-[var(--paper)]">World not found</p>}
      </section>
      <div className="relative z-10 mx-auto flex w-full max-w-[550px] flex-nowrap justify-center gap-1 px-1 pt-4 sm:gap-2">
        <Button asChild className="cartoon-press size-[clamp(36px,11vw,44px)] text-[var(--canvas-foreground)]" size="icon" title="Exit sandbox">
          <Link aria-label="Exit sandbox" to="/sandbox"><LogOut aria-hidden="true" /></Link>
        </Button>
        <Button
          aria-label="Save sandbox world"
          className="cartoon-press size-[clamp(36px,11vw,44px)] text-[var(--canvas-foreground)]"
          onClick={() => setSaveDialogOpen(true)}
          size="icon"
          title="Save sandbox world"
          type="button"
        >
          <Save aria-hidden="true" />
        </Button>
        <Button
          aria-label="Toggle draw mode"
          aria-pressed={drawEnabled}
          className={`cartoon-press size-[clamp(36px,11vw,44px)] text-[var(--canvas-foreground)] ${drawEnabled ? '!bg-[var(--yellow)]' : ''}`}
          onClick={() => {
            setDrawEnabled((enabled) => !enabled)
            setDeleteEnabled(false)
          }}
          size="icon"
          title="Toggle draw mode"
          type="button"
        >
          <PenLine aria-hidden="true" />
        </Button>
        <Button
          aria-label="Toggle delete mode"
          aria-pressed={deleteEnabled}
          className={`cartoon-press size-[clamp(36px,11vw,44px)] text-[var(--coral)] ${deleteEnabled ? '!bg-[var(--coral)] !text-[var(--paper)]' : ''}`}
          onClick={() => {
            setDeleteEnabled((enabled) => !enabled)
            setDrawEnabled(false)
          }}
          size="icon"
          title="Toggle delete mode"
          type="button"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <Dialog onOpenChange={setSaveDialogOpen} open={saveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save world</DialogTitle>
            <DialogDescription>Name this sandbox world and save the current canvas view.</DialogDescription>
          </DialogHeader>
          <label className="poster-kicker mt-5 block text-[11px] text-[var(--muted-text-color)]">
            World name
            <input
              autoFocus
              className="mt-2 h-[42px] w-full border border-[var(--outline-color)] bg-[var(--paper-muted)] px-3 text-[11px] text-[var(--canvas-foreground)] outline-none focus:border-[var(--canvas-foreground)]"
              disabled={isSaving}
              onChange={(event) => {
                setWorldName(event.target.value)
                setSaveError('')
              }}
              placeholder="Enter world name"
              type="text"
              value={worldName}
            />
          </label>
          {saveError && <p className="mt-3 text-[11px] text-[var(--coral)]" role="alert">{saveError}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button className="cartoon-press h-[42px] text-[11px] font-black tracking-[0.1em] text-[var(--canvas-foreground)] uppercase" disabled={isSaving} size="lg" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button className="cartoon-press h-[42px] text-[11px] font-black tracking-[0.1em] text-[var(--canvas-foreground)] uppercase" disabled={isSaving || !worldName.trim()} onClick={() => void saveWorld()} size="lg" type="button">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
