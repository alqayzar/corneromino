import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface SaveGameDialogProps {
  isSaving: boolean
  onDiscard: () => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
  open: boolean
}

export function SaveGameDialog(props: SaveGameDialogProps) {
  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save game</DialogTitle>
          <DialogDescription>Save this game to continue it later?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            className="cartoon-press h-[42px] text-[11px] font-black tracking-[0.1em] text-[var(--canvas-foreground)] uppercase"
            disabled={props.isSaving}
            onClick={props.onDiscard}
            size="lg"
            type="button"
          >
            Discard
          </Button>
          <Button
            className="cartoon-press h-[42px] text-[11px] font-black tracking-[0.1em] text-[var(--canvas-foreground)] uppercase"
            disabled={props.isSaving}
            onClick={props.onSave}
            size="lg"
            type="button"
          >
            Save
          </Button>
        </DialogFooter>
        <DialogClose asChild>
          <button className="mt-5 w-full text-[11px] text-[var(--muted-text-color)] underline underline-offset-4" disabled={props.isSaving} type="button">
            Cancel
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
