import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'
import type { SandboxWorldState } from '@/lib/db'

const BASE_CELL_SIZE = 56
const MIN_ZOOM = 0.2
const MAX_ZOOM = 5
const CELL_FILL_COLOR = 0xffd18a
const CELL_BORDER_COLOR = 0x773526
const CORNER_MARKER_COLOR = 0x713324
const CORNER_MARKER_TOP_RIGHT = 1
const CORNER_MARKER_BOTTOM_RIGHT = 2
const CORNER_MARKER_BOTTOM_LEFT = 3
const PAN_THRESHOLD = 4

interface PointerPosition {
  x: number
  y: number
}

interface SandboxCanvasProps {
  deleteEnabled: boolean
  drawEnabled: boolean
  initialState: SandboxWorldState | null
}

export interface SandboxCanvasHandle {
  captureWorld: () => Promise<{ screenshot: Blob; state: SandboxWorldState }>
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Could not capture the sandbox canvas.'))
      }
    }, 'image/png')
  })
}

export const SandboxCanvas = forwardRef<SandboxCanvasHandle, SandboxCanvasProps>(function SandboxCanvas(props, ref) {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const deleteEnabledRef = useRef(props.deleteEnabled)
  const drawEnabledRef = useRef(props.drawEnabled)
  const captureWorldRef = useRef<SandboxCanvasHandle['captureWorld'] | null>(null)
  deleteEnabledRef.current = props.deleteEnabled
  drawEnabledRef.current = props.drawEnabled

  useImperativeHandle(ref, () => ({
    captureWorld: async () => {
      if (!captureWorldRef.current) throw new Error('Sandbox canvas is not ready.')
      return captureWorldRef.current()
    },
  }), [])

  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    if (!canvasContainer) return
    const stableCanvasContainer: HTMLDivElement = canvasContainer

    const app = new Application()
    const grid = new Graphics()
    let disposed = false
    let initialized = false
    let gridOffsetX = props.initialState?.gridOffsetX ?? 0
    let gridOffsetY = props.initialState?.gridOffsetY ?? 0
    let hasInitialPosition = props.initialState !== null
    let isPanning = false
    let hasPanned = false
    let interactionWasPinch = false
    let lastPointerX = 0
    let lastPointerY = 0
    const activePointers = new Map<number, PointerPosition>()
    let pinchGridX = 0
    let pinchGridY = 0
    let pinchStartDistance = 0
    let pinchStartZoom = 1
    let zoom = props.initialState?.zoom ?? 1
    const cornerMarkers = new Map(props.initialState?.cornerMarkers.map((marker) => [marker.cellKey, marker.corner]))

    function drawGrid() {
      const cellSize = BASE_CELL_SIZE * zoom
      const borderWidth = 2 * zoom
      const firstColumn = Math.floor(-gridOffsetX / cellSize) - 1
      const lastColumn = Math.ceil((app.renderer.width - gridOffsetX) / cellSize) + 1
      const firstRow = Math.floor(-gridOffsetY / cellSize) - 1
      const lastRow = Math.ceil((app.renderer.height - gridOffsetY) / cellSize) + 1

      grid.clear()
      for (let row = firstRow; row <= lastRow; row += 1) {
        for (let column = firstColumn; column <= lastColumn; column += 1) {
          const x = column * cellSize + gridOffsetX
          const y = row * cellSize + gridOffsetY
          grid
            .roundRect(x + borderWidth / 2, y + borderWidth / 2, cellSize - borderWidth, cellSize - borderWidth, cellSize * 0.02)
            .fill({ color: CELL_FILL_COLOR })
            .stroke({ color: CELL_BORDER_COLOR, width: borderWidth })

          const cornerMarker = cornerMarkers.get(`${column},${row}`)
          if (cornerMarker === undefined) continue

          const markerSize = cellSize / 2
          const markerPadding = cellSize * 0.07
          const markerX = cornerMarker === CORNER_MARKER_TOP_RIGHT || cornerMarker === CORNER_MARKER_BOTTOM_RIGHT
            ? x + cellSize - markerPadding - markerSize
            : x + markerPadding
          const markerY = cornerMarker === CORNER_MARKER_BOTTOM_RIGHT || cornerMarker === CORNER_MARKER_BOTTOM_LEFT
            ? y + cellSize - markerPadding - markerSize
            : y + markerPadding

          grid
            .roundRect(markerX, markerY, markerSize, markerSize, markerSize * 0.1)
            .fill({ color: CORNER_MARKER_COLOR })
        }
      }
    }

    function rotateCornerMarker(event: PointerEvent) {
      const bounds = app.canvas.getBoundingClientRect()
      const cellSize = BASE_CELL_SIZE * zoom
      const column = Math.floor((event.clientX - bounds.left - gridOffsetX) / cellSize)
      const row = Math.floor((event.clientY - bounds.top - gridOffsetY) / cellSize)
      const cellKey = `${column},${row}`
      const currentCorner = cornerMarkers.get(cellKey)

      cornerMarkers.set(cellKey, currentCorner === undefined ? CORNER_MARKER_TOP_RIGHT : (currentCorner + 1) % 4)
      drawGrid()
    }

    function deleteCornerMarker(event: PointerEvent) {
      const bounds = app.canvas.getBoundingClientRect()
      const cellSize = BASE_CELL_SIZE * zoom
      const column = Math.floor((event.clientX - bounds.left - gridOffsetX) / cellSize)
      const row = Math.floor((event.clientY - bounds.top - gridOffsetY) / cellSize)

      cornerMarkers.delete(`${column},${row}`)
      drawGrid()
    }

    function resizeCanvas() {
      const width = stableCanvasContainer.clientWidth
      const height = stableCanvasContainer.clientHeight
      if (width === 0 || height === 0) return

      app.renderer.resize(width, height)
      if (!hasInitialPosition) {
        const cellSize = BASE_CELL_SIZE * zoom
        gridOffsetX = width / 2 - cellSize / 2
        gridOffsetY = height / 2 - cellSize / 2
        hasInitialPosition = true
      }
      drawGrid()
    }

    function handlePointerDown(event: PointerEvent) {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      app.canvas.setPointerCapture(event.pointerId)

      if (activePointers.size === 1) {
        isPanning = true
        hasPanned = false
        interactionWasPinch = false
        lastPointerX = event.clientX
        lastPointerY = event.clientY
        return
      }

      if (activePointers.size === 2) beginPinch()
    }

    function handlePointerMove(event: PointerEvent) {
      if (!activePointers.has(event.pointerId)) return
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (activePointers.size >= 2) {
        updatePinch()
        return
      }

      if (!isPanning) return

      if (!hasPanned && Math.hypot(event.clientX - lastPointerX, event.clientY - lastPointerY) < PAN_THRESHOLD) return
      hasPanned = true

      gridOffsetX += event.clientX - lastPointerX
      gridOffsetY += event.clientY - lastPointerY
      lastPointerX = event.clientX
      lastPointerY = event.clientY
      drawGrid()
    }

    function handlePointerUp(event: PointerEvent) {
      const shouldRotateCorner = activePointers.size === 1 && !hasPanned && !interactionWasPinch
      activePointers.delete(event.pointerId)
      if (app.canvas.hasPointerCapture(event.pointerId)) app.canvas.releasePointerCapture(event.pointerId)

      if (shouldRotateCorner && deleteEnabledRef.current) {
        deleteCornerMarker(event)
      } else if (shouldRotateCorner && drawEnabledRef.current) {
        rotateCornerMarker(event)
      }

      const [remainingPointer] = activePointers.values()
      if (remainingPointer) {
        isPanning = true
        hasPanned = false
        lastPointerX = remainingPointer.x
        lastPointerY = remainingPointer.y
      } else {
        isPanning = false
        interactionWasPinch = false
      }
    }

    function beginPinch() {
      const pointers = [...activePointers.values()]
      const firstPointer = pointers[0]
      const secondPointer = pointers[1]
      if (!firstPointer || !secondPointer) return

      const centerX = (firstPointer.x + secondPointer.x) / 2
      const centerY = (firstPointer.y + secondPointer.y) / 2
      const bounds = app.canvas.getBoundingClientRect()
      const cellSize = BASE_CELL_SIZE * zoom
      const canvasCenterX = centerX - bounds.left
      const canvasCenterY = centerY - bounds.top

      isPanning = false
      interactionWasPinch = true
      pinchStartDistance = Math.hypot(secondPointer.x - firstPointer.x, secondPointer.y - firstPointer.y)
      pinchStartZoom = zoom
      pinchGridX = (canvasCenterX - gridOffsetX) / cellSize
      pinchGridY = (canvasCenterY - gridOffsetY) / cellSize
    }

    function updatePinch() {
      const pointers = [...activePointers.values()]
      const firstPointer = pointers[0]
      const secondPointer = pointers[1]
      if (!firstPointer || !secondPointer || pinchStartDistance === 0) return

      const centerX = (firstPointer.x + secondPointer.x) / 2
      const centerY = (firstPointer.y + secondPointer.y) / 2
      const bounds = app.canvas.getBoundingClientRect()
      const currentDistance = Math.hypot(secondPointer.x - firstPointer.x, secondPointer.y - firstPointer.y)

      zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * (currentDistance / pinchStartDistance)))
      const cellSize = BASE_CELL_SIZE * zoom
      gridOffsetX = centerX - bounds.left - pinchGridX * cellSize
      gridOffsetY = centerY - bounds.top - pinchGridY * cellSize
      drawGrid()
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      const bounds = app.canvas.getBoundingClientRect()
      const pointerX = event.clientX - bounds.left
      const pointerY = event.clientY - bounds.top
      const previousCellSize = BASE_CELL_SIZE * zoom
      const gridX = (pointerX - gridOffsetX) / previousCellSize
      const gridY = (pointerY - gridOffsetY) / previousCellSize
      const zoomDirection = event.deltaY < 0 ? 1.1 : 0.9

      zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomDirection))
      const nextCellSize = BASE_CELL_SIZE * zoom
      gridOffsetX = pointerX - gridX * nextCellSize
      gridOffsetY = pointerY - gridY * nextCellSize
      drawGrid()
    }

    const resizeObserver = new ResizeObserver(resizeCanvas)

    async function startCanvas() {
      await app.init({
        antialias: true,
        autoDensity: true,
        background: CELL_BORDER_COLOR,
        height: Math.max(1, stableCanvasContainer.clientHeight),
        preserveDrawingBuffer: true,
        resolution: window.devicePixelRatio,
        width: Math.max(1, stableCanvasContainer.clientWidth),
      })
      initialized = true
      if (disposed) {
        app.destroy(true)
        return
      }

      app.stage.addChild(grid)
      captureWorldRef.current = async () => ({
        screenshot: await canvasToBlob(app.canvas),
        state: {
          cornerMarkers: [...cornerMarkers].map(([cellKey, corner]) => ({ cellKey, corner })),
          gridOffsetX,
          gridOffsetY,
          zoom,
        },
      })
      app.canvas.className = 'size-full touch-none'
      stableCanvasContainer.appendChild(app.canvas)
      app.canvas.addEventListener('pointerdown', handlePointerDown)
      app.canvas.addEventListener('pointermove', handlePointerMove)
      app.canvas.addEventListener('pointerup', handlePointerUp)
      app.canvas.addEventListener('pointercancel', handlePointerUp)
      app.canvas.addEventListener('wheel', handleWheel, { passive: false })
      resizeObserver.observe(stableCanvasContainer)
      resizeCanvas()
    }

    void startCanvas()

    return () => {
      disposed = true
      resizeObserver.disconnect()
      captureWorldRef.current = null
      if (!initialized) return
      app.canvas.removeEventListener('pointerdown', handlePointerDown)
      app.canvas.removeEventListener('pointermove', handlePointerMove)
      app.canvas.removeEventListener('pointerup', handlePointerUp)
      app.canvas.removeEventListener('pointercancel', handlePointerUp)
      app.canvas.removeEventListener('wheel', handleWheel)
      app.destroy(true)
    }
  }, [])

  return <div className="size-full" ref={canvasContainerRef} />
})
