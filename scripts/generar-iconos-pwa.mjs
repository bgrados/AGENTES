import { writeFileSync, mkdirSync } from "fs"
import { deflateSync } from "zlib"

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c
}

function crc32(data) {
  let c = 0xffffffff
  for (let n = 0; n < data.length; n++) {
    c = (c >>> 8) ^ crcTable[(c ^ data[n]) & 0xff]
  }
  return (c ^ 0xffffffff) >>> 0
}

function u32(v) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(v)
  return b
}

function pngChunk(type, data) {
  const buf = Buffer.concat([Buffer.from(type, "ascii"), data])
  return Buffer.concat([u32(data.length), buf, u32(crc32(buf))])
}

function crearPNG(pixels, width, height) {
  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const off = y * (1 + width * 4)
    rawData[off] = 0
    for (let x = 0; x < width; x++) {
      const srcOff = (y * width + x) * 4
      const dstOff = off + 1 + x * 4
      rawData[dstOff] = pixels[srcOff]
      rawData[dstOff + 1] = pixels[srcOff + 1]
      rawData[dstOff + 2] = pixels[srcOff + 2]
      rawData[dstOff + 3] = pixels[srcOff + 3]
    }
  }

  const ihdr = Buffer.concat([
    u32(width), u32(height),
    Buffer.from([8, 6, 0, 0, 0]),
  ])

  const compressed = deflateSync(rawData)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
}

function shieldIcon(size, bgColor, fgColor) {
  const pixels = Buffer.alloc(size * size * 4, 0)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const off = (y * size + x) * 4

      const absX = Math.abs(dx)
      const maxWidth = r * (1 - dy / (r * 1.5))
      let inside = absX <= maxWidth && dy <= r * 0.6

      if (!inside && dy > r * 0.6) {
        const taper = r * 1.2 * (1 - (dy - r * 0.6) / (r * 0.9))
        inside = absX <= taper
      }

      if (inside && dy <= r * 1.3) {
        pixels[off] = fgColor[0]
        pixels[off + 1] = fgColor[1]
        pixels[off + 2] = fgColor[2]
        pixels[off + 3] = 255
      } else {
        pixels[off] = bgColor[0]
        pixels[off + 1] = bgColor[1]
        pixels[off + 2] = bgColor[2]
        pixels[off + 3] = 255
      }
    }
  }

  return crearPNG(pixels, size, size)
}

const sizes = [192, 384, 512]
const blue = [30, 64, 175]
const white = [255, 255, 255]

mkdirSync("public/icons", { recursive: true })

for (const size of sizes) {
  const png = shieldIcon(size, blue, white)
  writeFileSync(`public/icons/icon-${size}x${size}.png`, png)
  console.log(`Created icon-${size}x${size}.png (${png.length} bytes)`)
}
