

type Bounds = { x: number, y: number, w: number, h: number }

export namespace ImgDiff {

  export function xor(a: Buffer, b: Buffer): Buffer {
    const res = Buffer.alloc(a.length)
    for (let i = 0; i < a.length; i++) {
      res[i] = a[i] ^ b[i]
    }
    return res
  }

  export function areIdentical(a: Buffer, b: Buffer): boolean {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i])
        return false
    }
    return true
  }

  export function getBounds(xor: Buffer, width: number, height: number): Bounds {
    let x = width
    let y = height
    let w = 0
    let h = 0
    for (let i = 0; i < Math.ceil(width * height / 8); i++) {
      for (let j = 0; j < 8; j++) {
        if (i * 8 + j >= width * height)
          break
        if ((xor[i] >> j) & 1) {
          x = Math.min(x, (i * 8 + j) % width)
          y = Math.min(y, ~~((i * 8 + j) / width))
          w = Math.max(w, (i * 8 + j) % width)
          h = Math.max(h, ~~((i * 8 + j) / width))
        }
      }
    }
    return { x, y, w: w - x + 1, h: h - y + 1 }
  }

  /** round x and y down to nearest 8th */
  export function rasterBounds(bounds: Bounds) {
    let previousUpperX = bounds.x + bounds.w
    let previousUpperY = bounds.y + bounds.h
    bounds.x = Math.floor(bounds.x / 8) * 8
    bounds.y = Math.floor(bounds.y / 8) * 8
    bounds.w = Math.ceil(bounds.w / 8) * 8
    bounds.h = Math.ceil(bounds.h / 8) * 8
    if (bounds.x + bounds.w < previousUpperX)
      bounds.w += 8
    if (bounds.y + bounds.h < previousUpperY)
      bounds.h += 8
    return bounds
  }

  export function copyBounds(src: Buffer, dest: Buffer, offset: number, bounds: Bounds, width: number) {
    let bitPos = 0;
    let byte = 0;

    for (let y = bounds.y; y < bounds.y + bounds.h; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
        const idx = x + y * width;
        const srcByte = Math.floor(idx / 8);
        const srcBit = idx % 8;
        const bit = (src[srcByte] >> srcBit) & 1;

        byte |= bit << (bitPos % 8);
        bitPos++;

        if (bitPos % 8 === 0) {
          dest[offset + Math.floor(bitPos / 8) - 1] = byte;
          byte = 0;
        }
      }
    }

    if (bitPos % 8 !== 0) {
      dest[offset + Math.floor(bitPos / 8)] = byte;
    }
  }

}
