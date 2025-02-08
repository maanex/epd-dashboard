import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas"


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
      data[~~y * ctx.canvas.width + ~~x] = 1 - data[~~y * ctx.canvas.width + ~~x]
    } else {
      data[~~y * ctx.canvas.width + ~~x] = value
    }

    changes = true
  }

  function newRect(fromX = 0, fromY = 0, width = 1, height = 1) {
    const rect = {
      x: fromX,
      y: fromY,
      w: width,
      h: height,
      br: 0
    }

    function checkBr(x: number, y: number) {
      if (rect.br === 0)
        return false

      const dTop = y - rect.y
      const dBottom = rect.y + rect.h - y
      const dLeft = x - rect.x
      const dRight = rect.x + rect.w - x

      if (rect.br > 0) {
        if (Math.sqrt(dTop**2 * dLeft**2) < rect.br) return true
        if (Math.sqrt(dTop**2 * dRight**2) < rect.br) return true
        if (Math.sqrt(dBottom**2 * dLeft**2) < rect.br) return true
        if (Math.sqrt(dBottom**2 * dRight**2) < rect.br) return true
      } else {
        if (Math.sqrt(dTop**3 * dLeft**3) < rect.br**2) return true
        if (Math.sqrt(dTop**3 * dRight**3) < rect.br**2) return true
        if (Math.sqrt(dBottom**3 * dLeft**3) < rect.br**2) return true
        if (Math.sqrt(dBottom**3 * dRight**3) < rect.br**2) return true
      }
      return false
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
      translate(dx: number, dy: number) {
        rect.x += ~~dx
        rect.y += ~~dy
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
      round: (radius: number) => {
        rect.br = radius
        return out
      },
      fill: (style: FillStyle, mix?: MixMode) => {
        for (let y = rect.y; y < rect.y + rect.h; y++) {
          for (let x = rect.x; x < rect.x + rect.w; x++) {
            if (checkBr(x, y)) continue
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
              if (checkBr(x, y)) continue
              setPixel(x, y, rasterize(style, x, y), mix)
            }
          }
        }
        return out
      }
    }

    return out
  }

  function newText(text: string, x = 0, y = 0, size = 20) {
    const data = {
      text,
      x,
      y,
      size,
      font: 'monospace',
      thresh: 0.9,
      anchorX: 'left',
      anchorY: 'top'
    }

    const out = {
      text: (text: string) => {
        data.text = text
        return out
      },
      at: (x: number, y: number) => {
        data.x = ~~x
        data.y = ~~y
        return out
      },
      translate: (dx: number, dy: number) => {
        data.x += ~~dx
        data.y += ~~dy
        return out
      },
      size: (size: number) => {
        data.size = ~~size
        return out
      },
      font: (font: string) => {
        data.font = font
        return out
      },
      anchor: (x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom') => {
        data.anchorX = x
        data.anchorY = y
        return out
      },
      threshold: (thresh: number) => {
        data.thresh = thresh
        return out
      },
      render: (style: FillStyle, mix?: MixMode) => {
        ctx.font = `${data.size}px ${data.font}`
        const innerWidth = ~~ctx.measureText(data.text).width
        const innerHeight = ~~(data.size * 1.2)
        const innerCanvas = createCanvas(innerWidth, innerHeight)
        const innerCtx = innerCanvas.getContext('2d')!
        innerCanvas.width = innerWidth
        innerCanvas.height = innerHeight
        innerCtx.fillStyle = 'white'
        innerCtx.fillRect(0, 0, innerWidth, innerHeight)
        innerCtx.fillStyle = 'black'
        innerCtx.font = `${data.size}px ${data.font}`
        innerCtx.textBaseline = 'top'
        innerCtx.fillText(data.text, 0, 0)

        let renderX = data.x
        if (data.anchorX === 'center') renderX -= innerWidth / 2
        if (data.anchorX === 'right') renderX -= innerWidth
        let renderY = data.y
        if (data.anchorY === 'center') renderY -= innerHeight / 2
        if (data.anchorY === 'bottom') renderY -= innerHeight

        const imgData = innerCtx.getImageData(0, 0, innerWidth, innerHeight)
        for (let y = 0; y < innerHeight; y++) {
          for (let x = 0; x < innerWidth; x++) {
            if (imgData.data[(y * innerWidth + x) * 4] >= (data.thresh * 255)) continue
            setPixel(renderX + x, renderY + y, rasterize(style, x, y), mix)
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
    newText,
    render
  }
}
