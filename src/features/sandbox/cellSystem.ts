export interface SandboxCornerMarker {
  cellKey: string
  corner: number
}

type CellUpdateHandler = (system: SandboxCellSystem, cellKey: string) => void

interface PendingCellUpdate {
  cellKey: string
  senderCellKey: string
}

interface CornerAlignment {
  corner: number
  mirrored: boolean
}

const CORNER_COUNT = 4
const TOP_LEFT_CORNER = 0
const TOP_RIGHT_CORNER = 1
const BOTTOM_RIGHT_CORNER = 2
const BOTTOM_LEFT_CORNER = 3
const NEIGHBOR_OFFSETS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

function parseCellKey(cellKey: string) {
  const [x, y] = cellKey.split(',').map(Number)
  return { x, y }
}

export class SandboxCellSystem {
  private readonly cornerMarkers: Map<string, number>
  private pendingUpdateIndex = 0
  private readonly pendingUpdates: PendingCellUpdate[] = []
  private readonly updateHandlers: CellUpdateHandler[]

  constructor(markers: readonly SandboxCornerMarker[]) {
    this.cornerMarkers = new Map(markers.map((marker) => [marker.cellKey, marker.corner]))
    this.updateHandlers = [
      (system, cellKey) => system.alignCornerWithPrioritizedNeighbor(cellKey),
    ]
  }

  getCorner(cellKey: string): number | undefined {
    return this.cornerMarkers.get(cellKey)
  }

  getMarkers(): SandboxCornerMarker[] {
    return [...this.cornerMarkers].map(([cellKey, corner]) => ({ cellKey, corner }))
  }

  rotateCornerFromUser(cellKey: string): void {
    const currentCorner = this.cornerMarkers.get(cellKey)
    const nextCorner = currentCorner === undefined ? TOP_RIGHT_CORNER : (currentCorner + 1) % CORNER_COUNT
    this.cornerMarkers.set(cellKey, nextCorner)
    if (currentCorner !== nextCorner) this.sendUpdateToNeighbors(cellKey, null)
  }

  removeCornerFromUser(cellKey: string): void {
    if (!this.cornerMarkers.delete(cellKey)) return
    this.sendUpdateToNeighbors(cellKey, null)
  }

  hasPendingUpdates(): boolean {
    return this.pendingUpdateIndex < this.pendingUpdates.length
  }

  processUpdates(maximumUpdates: number): number {
    let processedUpdates = 0

    while (processedUpdates < maximumUpdates && this.hasPendingUpdates()) {
      const update = this.pendingUpdates[this.pendingUpdateIndex]
      this.pendingUpdateIndex += 1
      if (update) this.receiveUpdate(update.cellKey, update.senderCellKey)
      processedUpdates += 1
    }

    if (this.pendingUpdateIndex > 1024 && this.pendingUpdateIndex * 2 > this.pendingUpdates.length) {
      this.pendingUpdates.splice(0, this.pendingUpdateIndex)
      this.pendingUpdateIndex = 0
    }

    return processedUpdates
  }

  private alignCornerWithPrioritizedNeighbor(cellKey: string): void {
    const currentCorner = this.cornerMarkers.get(cellKey)
    if (currentCorner === undefined) return

    const horizontalAlignment = this.getHorizontalAlignment(cellKey, currentCorner)
    const verticalAlignment = this.getVerticalAlignment(cellKey, currentCorner)
    const preferredAlignment = [horizontalAlignment, verticalAlignment].find((alignment) => alignment && !alignment.mirrored)
      ?? horizontalAlignment
      ?? verticalAlignment

    if (preferredAlignment) this.cornerMarkers.set(cellKey, preferredAlignment.corner)
  }

  private getHorizontalAlignment(cellKey: string, currentCorner: number): CornerAlignment | undefined {
    const { x, y } = parseCellKey(cellKey)
    if (currentCorner === TOP_RIGHT_CORNER || currentCorner === BOTTOM_RIGHT_CORNER) {
      const leftNeighborCorner = this.cornerMarkers.get(`${x - 1},${y}`)
      if (leftNeighborCorner === TOP_RIGHT_CORNER || leftNeighborCorner === BOTTOM_RIGHT_CORNER) {
        return { corner: leftNeighborCorner, mirrored: false }
      } else if (leftNeighborCorner === TOP_LEFT_CORNER) {
        return { corner: BOTTOM_RIGHT_CORNER, mirrored: true }
      } else if (leftNeighborCorner === BOTTOM_LEFT_CORNER) {
        return { corner: TOP_RIGHT_CORNER, mirrored: true }
      }
    }

    if (currentCorner === TOP_LEFT_CORNER || currentCorner === BOTTOM_LEFT_CORNER) {
      const rightNeighborCorner = this.cornerMarkers.get(`${x + 1},${y}`)
      if (rightNeighborCorner === TOP_LEFT_CORNER || rightNeighborCorner === BOTTOM_LEFT_CORNER) {
        return { corner: rightNeighborCorner, mirrored: false }
      } else if (rightNeighborCorner === TOP_RIGHT_CORNER) {
        return { corner: BOTTOM_LEFT_CORNER, mirrored: true }
      } else if (rightNeighborCorner === BOTTOM_RIGHT_CORNER) {
        return { corner: TOP_LEFT_CORNER, mirrored: true }
      }
    }
  }

  private getVerticalAlignment(cellKey: string, currentCorner: number): CornerAlignment | undefined {
    const { x, y } = parseCellKey(cellKey)
    if (currentCorner === TOP_LEFT_CORNER || currentCorner === TOP_RIGHT_CORNER) {
      const bottomNeighborCorner = this.cornerMarkers.get(`${x},${y + 1}`)
      if (bottomNeighborCorner === TOP_LEFT_CORNER || bottomNeighborCorner === TOP_RIGHT_CORNER) {
        return { corner: bottomNeighborCorner, mirrored: false }
      } else if (bottomNeighborCorner === BOTTOM_LEFT_CORNER) {
        return { corner: TOP_RIGHT_CORNER, mirrored: true }
      } else if (bottomNeighborCorner === BOTTOM_RIGHT_CORNER) {
        return { corner: TOP_LEFT_CORNER, mirrored: true }
      }
    }

    if (currentCorner === BOTTOM_LEFT_CORNER || currentCorner === BOTTOM_RIGHT_CORNER) {
      const topNeighborCorner = this.cornerMarkers.get(`${x},${y - 1}`)
      if (topNeighborCorner === BOTTOM_LEFT_CORNER || topNeighborCorner === BOTTOM_RIGHT_CORNER) {
        return { corner: topNeighborCorner, mirrored: false }
      } else if (topNeighborCorner === TOP_LEFT_CORNER) {
        return { corner: BOTTOM_RIGHT_CORNER, mirrored: true }
      } else if (topNeighborCorner === TOP_RIGHT_CORNER) {
        return { corner: BOTTOM_LEFT_CORNER, mirrored: true }
      }
    }
  }

  private receiveUpdate(cellKey: string, senderCellKey: string): void {
    if (!this.cornerMarkers.has(cellKey)) return

    const cornerBeforeUpdate = this.cornerMarkers.get(cellKey)
    for (const updateHandler of this.updateHandlers) {
      updateHandler(this, cellKey)
    }
    if (cornerBeforeUpdate !== this.cornerMarkers.get(cellKey)) {
      this.sendUpdateToNeighbors(cellKey, senderCellKey)
    }
  }

  private sendUpdateToNeighbors(cellKey: string, senderCellKey: string | null): void {
    const { x, y } = parseCellKey(cellKey)

    for (const offset of NEIGHBOR_OFFSETS) {
      const neighborCellKey = `${x + offset.x},${y + offset.y}`
      if (neighborCellKey === senderCellKey || !this.cornerMarkers.has(neighborCellKey)) continue
      this.pendingUpdates.push({ cellKey: neighborCellKey, senderCellKey: cellKey })
    }
  }
}
