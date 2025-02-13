

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

  export function getBounds(xor: Buffer, width: number, height: number): { x: number, y: number, w: number, h: number } {
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

  export function copyBounds(src: Buffer, dest: Buffer, offset: number, bounds: { x: number, y: number, w: number, h: number }, width: number) {
    for (let i = 0; i < bounds.h; i++) {
      src.copy(
        dest,
        offset + i * bounds.w,
        (bounds.y + i) * width + bounds.x,
        bounds.w
      )
    }
  }

}
