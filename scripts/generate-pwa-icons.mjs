import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const colors = {
  amber: [255, 209, 138, 255],
  outline: [119, 53, 38, 255],
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([length, typeBytes, data, checksum])
}

function drawRoundedRect(pixels, size, x, y, width, height, radius, color) {
  for (let pixelY = Math.max(0, y); pixelY < Math.min(size, y + height); pixelY += 1) {
    for (let pixelX = Math.max(0, x); pixelX < Math.min(size, x + width); pixelX += 1) {
      const cornerX = pixelX < x + radius ? x + radius : pixelX >= x + width - radius ? x + width - radius - 1 : pixelX
      const cornerY = pixelY < y + radius ? y + radius : pixelY >= y + height - radius ? y + height - radius - 1 : pixelY
      if ((pixelX - cornerX) ** 2 + (pixelY - cornerY) ** 2 > radius ** 2) continue
      const offset = (pixelY * size + pixelX) * 4
      pixels.set(color, offset)
    }
  }
}

function createIcon(size) {
  const pixels = new Uint8Array(size * size * 4)
  const scale = size / 128
  const scaled = (value) => Math.round(value * scale)
  drawRoundedRect(pixels, size, scaled(8), scaled(8), scaled(112), scaled(112), scaled(3), colors.outline)
  drawRoundedRect(pixels, size, scaled(12), scaled(12), scaled(104), scaled(104), scaled(1), colors.amber)
  drawRoundedRect(pixels, size, scaled(16), scaled(16), scaled(56), scaled(56), scaled(6), colors.outline)

  const rows = Buffer.alloc((size * 4 + 1) * size)
  for (let row = 0; row < size; row += 1) {
    rows[row * (size * 4 + 1)] = 0
    Buffer.from(pixels.buffer, row * size * 4, size * 4).copy(rows, row * (size * 4 + 1) + 1)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
for (const size of [192, 512]) writeFileSync(`public/icons/corneromino-${size}.png`, createIcon(size))
