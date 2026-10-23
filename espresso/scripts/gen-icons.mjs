// Generates the PWA PNG icons with no dependencies (node:zlib only). Output is committed to public/.
import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [28, 25, 23]
const RING = [245, 158, 11]

function png(size, { maskable }) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const c = (size - 1) / 2
  // Maskable icons keep content inside the central 80% safe zone.
  const outer = size * (maskable ? 0.3 : 0.36)
  const inner = outer * 0.5
  const cornerR = maskable ? 0 : size * 0.22
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c)
      // Rounded-corner mask for non-maskable icons.
      const dx = Math.max(Math.abs(x - c) - (c - cornerR), 0)
      const dy = Math.max(Math.abs(y - c) - (c - cornerR), 0)
      const inside = cornerR === 0 || Math.hypot(dx, dy) <= cornerR
      let px = [0, 0, 0, 0]
      if (inside) px = d <= inner ? [...BG, 255] : d <= outer ? [...RING, 255] : [...BG, 255]
      raw.set(px, row + 1 + x * 4)
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', png(192, { maskable: false }))
writeFileSync('public/icon-512.png', png(512, { maskable: false }))
writeFileSync('public/icon-maskable-512.png', png(512, { maskable: true }))
writeFileSync('public/apple-touch-icon.png', png(180, { maskable: true }))
console.log('icons written')
