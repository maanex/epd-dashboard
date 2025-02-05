import type { SKRSContext2D } from "@napi-rs/canvas"


type FillStyle = 'white' | 'lighter' | 'light' | 'medium' | 'dark' | 'black'
type MixMode = 'default' | 'darken' | 'lighten' | 'invert'

function rasterize(style: FillStyle, x: number, y: number) {
  if (style === 'black') return 0
  if (style === 'white') return 1
  if (style === 'lighter') return ((x + y*19) % 8) === 0 ? 0 : 1
  if (style === 'light') return ((x + y*2) % 4) === 0 ? 0 : 1
  if (style === 'medium') return ((x + y) % 2) === 0 ? 0 : 1
  if (style === 'dark') return ((x + y*2) % 4) === 0 ? 1 : 0
  return 0
}

export const usePaint = (ctx: SKRSContext2D) => {
  const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  const data = new Uint8Array(ctx.canvas.width * ctx.canvas.height)
  for (let i = 0; i < (ctx.canvas.width * ctx.canvas.height); i++)
    data[i] = imgData.data[i*4] >= 128 ? 1 : 0

  let changes = false

  function setPixel(x: number, y: number, value: 0 | 1, mix?: MixMode) {
    if (y < 0 || y >= ctx.canvas.height || x < 0 || x >= ctx.canvas.width) return

    if (mix === 'darken' && value === 1) return
    if (mix === 'lighten' && value === 0) return

    if (mix === 'invert') {
      if (value === 1) return
      data[y * ctx.canvas.width + x] = 1 - data[y * ctx.canvas.width + x]
    } else {
      data[y * ctx.canvas.width + x] = value
    }

    changes = true
  }

  function newRect(fromX = 0, fromY = 0, width = 1, height = 1) {
    const rect = {
      x: fromX,
      y: fromY,
      w: width,
      h: height
    }

    const out = {
      from: (fromX: number, fromY: number) => {
        rect.x = ~~fromX
        rect.y = ~~fromY
        return out
      },
      sized: (width: number, height: number) => {
        rect.w = ~~width
        rect.h = ~~height
        return out
      },
      to: (toX: number, toY: number) => {
        rect.w = ~~(toX - rect.x)
        rect.h = ~~(toY - rect.y)
        return out
      },
      inset: (dx: number, dy?: number) => {
        if (dy === undefined) dy = dx
        rect.x += ~~dx
        rect.y += ~~dy
        rect.w -= ~~dx * 2
        rect.h -= ~~dy * 2
        return out
      },
      fill: (style: FillStyle, mix?: MixMode) => {
        for (let y = rect.y; y < rect.y + rect.h; y++) {
          for (let x = rect.x; x < rect.x + rect.w; x++) {
            setPixel(x, y, rasterize(style, x, y), mix)
          }
        }
        return out
      },
      outline: (style: FillStyle, width = 1, mix?: MixMode) => {
        if (width < 0) return out
        for (let y = rect.y; y < rect.y + rect.h; y++) {
          for (let x = rect.x; x < rect.x + rect.w; x++) {
            if (x < rect.x + width || x >= rect.x + rect.w - width || y < rect.y + width || y >= rect.y + rect.h - width) {
              setPixel(x, y, rasterize(style, x, y), mix)
            }
          }
        }
        return out
      }
    }

    return out
  }

  function render(onlyIfChanges = false) {
    if (onlyIfChanges && !changes) return
    for (let i = 0; i < data.length; i++) {
      imgData.data[i*4] = data[i] * 255
      imgData.data[i*4+1] = data[i] * 255
      imgData.data[i*4+2] = data[i] * 255
      imgData.data[i*4+3] = 255
    }
    ctx.putImageData(imgData, 0, 0)
    changes = false
  }

  return {
    setPixel,
    newRect,
    render
  }
}
