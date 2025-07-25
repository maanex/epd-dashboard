import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas"
import { TextUtils } from "./text-utils"
import { cFont } from "./c-font"


export type FillStyle = 'white' | 'lightest' | 'lighter' | 'light' | 'medium' | 'dark' | 'black' | 'checker'
export type MixMode = 'default' | 'darken' | 'lighten' | 'invert'


type RectPaint = {
  from: (fromX: number | null, fromY: number | null) => RectPaint
  sized: (width: number | null, height: number | null) => RectPaint
  to: (toX: number, toY: number) => RectPaint
  translate: (dx: number, dy: number) => RectPaint
  inset: (dx: number, dy?: number) => RectPaint
  round: (radius: number) => RectPaint
  fill: (style: FillStyle, mix?: MixMode) => RectPaint
  outline: (style: FillStyle, width: number, mix?: MixMode) => RectPaint
  useCopy: (fn: (rect: RectPaint) => any) => RectPaint
  getSize: () => { x: number, y: number, width: number, height: number }
}

function rasterize(style: FillStyle, x: number, y: number) {
  if (style === 'black') return 0
  if (style === 'white') return 1
  if (style === 'lightest') return ((x + y*74) % 34) === 0 ? 0 : 1
  if (style === 'lighter') return ((x + y*19) % 8) === 0 ? 0 : 1
  if (style === 'light') return ((x + y*2) % 4) === 0 ? 0 : 1
  if (style === 'medium') return ((x + y) % 2) === 0 ? 0 : 1
  if (style === 'dark') return ((x + y*2) % 4) === 0 ? 1 : 0
  if (style === 'checker') return (x % 10 < 5) === (y % 10 < 5) ? 0 : 1
  return 0
}

function rotatePoint(x: number, y: number, angle: number, cx: number, cy: number) {
  const rad = (angle * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  const newX = cx + dx * Math.cos(rad) - dy * Math.sin(rad)
  const newY = cy + dx * Math.sin(rad) + dy * Math.cos(rad)
  return [newX, newY]
}

export const usePaint = (ctx: SKRSContext2D, startX = 0, startY = 0, screenWidth = ctx.canvas.width, screenHeight = ctx.canvas.height) => {
  const imgData = ctx.getImageData(startX, startY, screenWidth, screenHeight)
  const data = new Uint8Array(screenWidth * screenHeight)
  for (let i = 0; i < (screenWidth * screenHeight); i++)
    data[i] = imgData.data[i*4] >= 128 ? 1 : 0

  let changes = false

  const global = {
    translateX: 0,
    translateY: 0
  }

  function setPixel(x: number, y: number, value: 0 | 1, mix?: MixMode) {
    x += global.translateX
    y += global.translateY
    if (y < 0 || y >= screenHeight || x < 0 || x >= screenWidth) return

    if (mix === 'darken' && value === 1) return
    if (mix === 'lighten' && value === 0) return

    if (mix === 'invert') {
      if (value === 1) return
      data[~~y * screenWidth + ~~x] = 1 - data[~~y * screenWidth + ~~x]
    } else {
      data[~~y * screenWidth + ~~x] = value
    }

    changes = true
  }

  function newRect(fromX = 0, fromY = 0, width = 1, height = 1, br = 0) {
    const rect = {
      x: fromX,
      y: fromY,
      w: width,
      h: height,
      br
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

    const out: RectPaint = {
      from: (fromX: number | null, fromY: number | null) => {
        rect.x = fromX === null ? rect.x : ~~fromX
        rect.y = fromY === null ? rect.y : ~~fromY
        return out
      },
      sized: (width: number | null, height: number | null) => {
        rect.w = width === null ? rect.w : ~~width
        rect.h = height === null ? rect.h : ~~height
        return out
      },
      to: (toX: number, toY: number) => {
        rect.w = ~~(toX - rect.x)
        rect.h = ~~(toY - rect.y)
        return out
      },
      translate: (dx: number, dy: number) => {
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
      },
      useCopy: (fn: (rect: ReturnType<typeof newRect>) => any) => {
        fn(newRect(rect.x, rect.y, rect.w, rect.h, rect.br))
        return out
      },
      getSize: () => ({ x: rect.x, y: rect.y, width: rect.w, height: rect.h })
    }

    return out
  }

  function newText(text: string, x = 0, y = 0, size = 20) {
    const data = {
      text,
      x,
      y,
      size,
      font: 'NotoSans',
      thresh: 0.9,
      anchorX: 'left',
      anchorY: 'top',
      maxWidth: 0,
      anchorSnap: 0
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
      maxWidth: (maxWidth: number) => {
        data.maxWidth = maxWidth
        return out
      },
      render: (style: FillStyle, mix?: MixMode) => {
        ctx.font = `${data.size}px '${data.font}'`
        const metrics = ctx.measureText(data.text)
        const innerWidth = ~~((metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) * 1.05)
        const innerHeight = ~~(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
        const innerCanvas = createCanvas(innerWidth, innerHeight)
        const innerCtx = innerCanvas.getContext('2d')!
        innerCanvas.width = innerWidth
        innerCanvas.height = innerHeight
        innerCtx.fillStyle = 'white'
        innerCtx.fillRect(0, 0, innerWidth, innerHeight)
        innerCtx.fillStyle = 'black'
        innerCtx.font = `${data.size}px '${data.font}'`
        innerCtx.textBaseline = 'alphabetic'
        innerCtx.fillText(data.text, ~~metrics.actualBoundingBoxLeft, innerHeight - metrics.actualBoundingBoxDescent)

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
      },
      renderOutline: (style: FillStyle, size: number, mix?: MixMode) => {
        ctx.font = `${data.size}px '${data.font}'`
        const metrics = ctx.measureText(data.text)
        const innerWidth = ~~((metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) * 1.05)
        const innerHeight = ~~(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
        const innerCanvas = createCanvas(innerWidth, innerHeight)
        const innerCtx = innerCanvas.getContext('2d')!
        innerCanvas.width = innerWidth + size * 2
        innerCanvas.height = innerHeight + size * 2
        innerCtx.fillStyle = 'white'
        innerCtx.fillRect(0, 0, innerWidth, innerHeight)
        innerCtx.fillStyle = 'black'
        innerCtx.font = `${data.size}px '${data.font}'`
        innerCtx.textBaseline = 'alphabetic'
        innerCtx.fillText(data.text, ~~metrics.actualBoundingBoxLeft, innerHeight - metrics.actualBoundingBoxDescent)

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

            for (let ix = -size; ix <= size; ix++) {
              for (let iy = -size; iy <= size; iy++) {
                if (Math.sqrt(ix**2 + iy**2) > size**2) continue
                setPixel(renderX + x + ix, renderY + y + iy, rasterize(style, x + ix, y + iy), mix)
              }
            }
          }
        }

        return out
      },
      toRect: () => {
        ctx.font = `${data.size}px '${data.font}'`
        const metrics = ctx.measureText(data.text)
        const innerWidth = ~~((metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) * 1.05)
        const innerHeight = ~~(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)

        let renderX = data.x
        if (data.anchorX === 'center') renderX -= innerWidth / 2
        if (data.anchorX === 'right') renderX -= innerWidth
        let renderY = data.y
        if (data.anchorY === 'center') renderY -= innerHeight / 2
        if (data.anchorY === 'bottom') renderY -= innerHeight

        return newRect(renderX, renderY, innerWidth, innerHeight) 
      },
      useRect: (fn: (rect: ReturnType<typeof newRect>) => any) => {
        fn(out.toRect())
        return out
      }
    }
    return out
  }

  function newBitText(text: string, x = 0, y = 0) {
    const data = {
      text: substituteText(text),
      x,
      y,
      size: 16 as (8 | 12 | 16 | 20 | 24 | 'auto'),
      anchorX: 'left',
      anchorY: 'top',
      justify: 'left',
      maxWidth: 0,
      maxHeight: 0
    }

    function substituteText(text: string) {
      return text
        .replaceAll('ä', 'ae')
        .replaceAll('Ä', 'AE')
        .replaceAll('ö', 'oe')
        .replaceAll('Ö', 'OE')
        .replaceAll('ü', 'ue')
        .replaceAll('Ü', 'UE')
        .replaceAll('ß', 'ss')
        .replaceAll('ẞ', 'SS')
    }

    function getSize() {
      if (data.size !== 'auto')
        return data.size

      for (const option of [24, 20, 16, 12, 8] as const) {
        const height = option
        const width = cFont[option].width

        const lines = TextUtils.sliceIntoNewlines(data.text, data.maxWidth / width)
        if (lines.length * height <= data.maxHeight)
          return option
      }

      return 8
    }

    const out = {
      text: (text: string) => {
        data.text = substituteText(text)
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
      size: (size: 8 | 12 | 16 | 20 | 24 | 'auto') => {
        data.size = size
        return out
      },
      anchor: (x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom') => {
        data.anchorX = x
        data.anchorY = y
        return out
      },
      justify: (dir: 'left' | 'center' | 'right') => {
        data.justify = dir
        return out
      },
      maxWidth: (maxWidth: number) => {
        data.maxWidth = maxWidth
        return out
      },
      maxHeight: (maxHeight: number) => {
        data.maxHeight = maxHeight
        return out
      },
      render: (style: FillStyle, mix?: MixMode) => {
        const size = getSize()
        const font = cFont[size]
        const lines = TextUtils.sliceIntoNewlines(data.text, data.maxWidth / font.width)
        const boxWidth = Math.max(...lines.map(line => line.length * font.width))
        const boxHeight = lines.length * size

        let renderX = data.x
        if (data.anchorX === 'center') renderX -= boxWidth / 2
        if (data.anchorX === 'right') renderX -= boxWidth
        let renderY = data.y
        if (data.anchorY === 'center') renderY -= boxHeight / 2
        if (data.anchorY === 'bottom') renderY -= boxHeight

        const maxWidth = Math.max(...lines.map(l => l.length)) * font.width

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const lineWidth = line.length * font.width
          const cY = renderY + i * size
          for (let j = 0; j < line.length; j++) {
            const char = line[j]
            const charData = (font as any)[char]
            if (!charData) continue
            let cX = renderX + j * font.width
            if (data.justify === 'center')
              cX += (maxWidth - lineWidth) / 2
            else if (data.justify === 'right')
              cX += maxWidth - lineWidth

            let byte = 0
            for (let row = 0; row < size; row++) {
              for (let col = 0; col < font.width; col++) {
                if (charData[byte] & (0x80 >> (col % 8)))
                  setPixel(cX + col, cY + row, rasterize(style, x, y), mix)

                if (col % 8 === 7)
                  byte++
              }

              if (font.width % 8 !== 0)
                byte++
            }
          }
        }

        return out
      },
      toRect: () => {
        const size = getSize()
        const font = cFont[size]
        const lines = TextUtils.sliceIntoNewlines(data.text, data.maxWidth / font.width)
        const boxWidth = Math.max(...lines.map(line => line.length * font.width))
        const boxHeight = lines.length * size

        let renderX = data.x
        if (data.anchorX === 'center') renderX -= boxWidth / 2
        if (data.anchorX === 'right') renderX -= boxWidth
        let renderY = data.y
        if (data.anchorY === 'center') renderY -= boxHeight / 2
        if (data.anchorY === 'bottom') renderY -= boxHeight

        return newRect(renderX, renderY, boxWidth, boxHeight) 
      },
      useRect: (fn: (rect: ReturnType<typeof newRect>) => any) => {
        fn(out.toRect())
        return out
      }
    }
    return out
  }

  function newTriangle(x = 0, y = 0, size = 20, stretch = 1) {
    const tri = {
      x,
      y,
      size,
      stretch,
      rot: 0
    }

    const out = {
      at: (x: number, y: number) => {
        tri.x = ~~x
        tri.y = ~~y
        return out
      },
      translate: (dx: number, dy: number) => {
        tri.x += ~~dx
        tri.y += ~~dy
        return out
      },
      size: (size: number) => {
        tri.size = ~~size
        return out
      },
      stretch: (stretch: number) => {
        tri.stretch = stretch
        return out
      },
      rotate: (rot: number) => {
        tri.rot = rot
        return out
      },
      fill: (style: FillStyle, mix?: MixMode) => {
        // chatgpt ass function
        const x0 = tri.x
        const y0 = tri.y - tri.size
        const x1 = tri.x - (tri.size * Math.cos(Math.PI / 6)) * tri.stretch
        const y1 = tri.y + (tri.size * Math.sin(Math.PI / 6))
        const x2 = tri.x + (tri.size * Math.cos(Math.PI / 6)) * tri.stretch
        const y2 = y1

        const [x0r, y0r] = rotatePoint(x0, y0, tri.rot, tri.x, tri.y)
        const [x1r, y1r] = rotatePoint(x1, y1, tri.rot, tri.x, tri.y)
        const [x2r, y2r] = rotatePoint(x2, y2, tri.rot, tri.x, tri.y)

        const edgeFunction = (ax: number, ay: number, bx: number, by: number, px: number, py: number) => (px - ax) * (by - ay) - (py - ay) * (bx - ax)

        const minX = Math.floor(Math.min(x0r, x1r, x2r))
        const maxX = Math.ceil(Math.max(x0r, x1r, x2r))
        const minY = Math.floor(Math.min(y0r, y1r, y2r))
        const maxY = Math.ceil(Math.max(y0r, y1r, y2r))

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            let w0 = edgeFunction(x1r, y1r, x2r, y2r, x, y)
            let w1 = edgeFunction(x2r, y2r, x0r, y0r, x, y)
            let w2 = edgeFunction(x0r, y0r, x1r, y1r, x, y)
            if (w0 >= 0 && w1 >= 0 && w2 >= 0)
              setPixel(x, y, rasterize(style, x, y), mix)
          }
        }

        return out
      }
    }
    return out
  }

  function newIcon(icon: number[], x = 0, y = 0) {
    const data = {
      icon,
      x,
      y,
      anchorX: 'left',
      anchorY: 'top',
    }

    const out = {
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
      anchor: (x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom') => {
        data.anchorX = x
        data.anchorY = y
        return out
      },
      fill: (style: FillStyle, mix?: MixMode) => {
        const size = ~~Math.sqrt(data.icon.length)

        let renderX = data.x
        if (data.anchorX === 'center') renderX -= ~~(size / 2)
        if (data.anchorX === 'right') renderX -= size
        let renderY = data.y
        if (data.anchorY === 'center') renderY -= ~~(size / 2)
        if (data.anchorY === 'bottom') renderY -= size
   
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const index = y * size + x
            if (data.icon[index] === 0) continue
            setPixel(x + renderX, y + renderY, rasterize(style, x + renderX, y + renderY), mix)
          }
        }
      }
    }
    return out
  }

  function newYarndings(text: string, x = 0, y = 0) {
    const data = {
      text,
      x,
      y,
      anchorX: 'left',
      anchorY: 'top'
    }

    const fontSize = 48
    const targetSize = 20
    const font = 'Yarndings20'

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
      anchor: (x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom') => {
        data.anchorX = x
        data.anchorY = y
        return out
      },
      render: (style: FillStyle, mix?: MixMode) => {
        ctx.font = `${fontSize}px '${font}'`
        const metrics = ctx.measureText(data.text)
        const renderWidth = ~~(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight)
        const renderHeight = ~~(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
        const innerCanvas = createCanvas(renderWidth, renderHeight)
        const innerCtx = innerCanvas.getContext('2d')!
        innerCanvas.width = renderWidth
        innerCanvas.height = renderHeight
        innerCtx.fillStyle = 'white'
        innerCtx.fillRect(0, 0, renderWidth, renderHeight)
        innerCtx.fillStyle = 'black'
        innerCtx.font = `${fontSize}px '${font}'`
        innerCtx.textBaseline = 'alphabetic'
        innerCtx.fillText(data.text, ~~metrics.actualBoundingBoxLeft, renderHeight - metrics.actualBoundingBoxDescent)

        const realWidth = data.text.length * targetSize
        const realHeight = targetSize

        let renderX = data.x
        if (data.anchorX === 'center') renderX -= realWidth / 2
        if (data.anchorX === 'right') renderX -= realWidth
        let renderY = data.y
        if (data.anchorY === 'center') renderY -= realHeight / 2
        if (data.anchorY === 'bottom') renderY -= realHeight

        const imgData = innerCtx.getImageData(0, 0, renderWidth, renderHeight)
        let sampleY = 0
        let sampleX = 0
        for (let y = 0; y < realHeight; y++) {
          sampleY = Math.ceil(y / realHeight * renderHeight)
          for (let x = 0; x < realWidth; x++) {
            sampleX = Math.ceil(x / realWidth * renderWidth)
            if (imgData.data[(sampleY * renderWidth + sampleX) * 4] >= 0.5) continue
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
    ctx.putImageData(imgData, startX, startY)
    changes = false
  }

  function transform(dx: number, dy: number) {
    global.translateX += ~~dx
    global.translateY += ~~dy
  }

  function clearTransform() {
    global.translateX = 0
    global.translateY = 0
  }

  return {
    transform,
    clearTransform,
    setPixel,
    newRect,
    newText,
    newBitText,
    newTriangle,
    newIcon,
    newYarndings,
    render
  }
}
