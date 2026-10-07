import { useEffect, useRef, useState } from 'react'

const MARKER_SIZE_PERCENT = 50
const MARKER_PADDING_PERCENT = 7
const MARKER_MAX_POSITION_PERCENT = 100 - MARKER_SIZE_PERCENT - MARKER_PADDING_PERCENT

function clampMarkerPosition(position: number) {
  return Math.min(MARKER_MAX_POSITION_PERCENT, Math.max(MARKER_PADDING_PERCENT, position))
}

const TITLE_TETROMINO_CELL_COUNT = 4

export function TitleTetromino() {
  const cellRefs = useRef<Array<HTMLDivElement | null>>([])
  const [markerPositions, setMarkerPositions] = useState(() => (
    Array.from({ length: TITLE_TETROMINO_CELL_COUNT }, () => ({ x: MARKER_MAX_POSITION_PERCENT, y: MARKER_PADDING_PERCENT }))
  ))

  useEffect(() => {
    let pointerIsPressed = false

    function moveMarker(event: PointerEvent) {
      setMarkerPositions((positions) => positions.map((position, index) => {
        const cell = cellRefs.current[index]
        if (!cell) return position

        const bounds = cell.getBoundingClientRect()
        return {
          x: clampMarkerPosition(((event.clientX - bounds.left) / bounds.width) * 100 - MARKER_SIZE_PERCENT / 2),
          y: clampMarkerPosition(((event.clientY - bounds.top) / bounds.height) * 100 - MARKER_SIZE_PERCENT / 2),
        }
      }))
    }

    function handlePointerDown(event: PointerEvent) {
      pointerIsPressed = true
      moveMarker(event)
    }

    function handlePointerMove(event: PointerEvent) {
      if (pointerIsPressed) moveMarker(event)
    }

    function releasePointer() {
      pointerIsPressed = false
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', releasePointer)
    window.addEventListener('pointercancel', releasePointer)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', releasePointer)
      window.removeEventListener('pointercancel', releasePointer)
    }
  }, [])

  return (
    <div aria-hidden="true" className="grid size-[132px] gap-1 grid-cols-2">
      {markerPositions.map((markerPosition, index) => (
        <div className="relative aspect-square rounded-[2%] border-4 border-[#773526] bg-[#ffd18a]" key={index} ref={(element) => { cellRefs.current[index] = element }}>
          <span
            className="absolute z-10 w-1/2 aspect-square rounded-[10%] bg-[var(--outline-color)] transition-[left,top] duration-150 ease-out"
            style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%` }}
          />
        </div>
      ))}
    </div>
  )
}
