import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas'
import { promises } from 'fs'
import { join } from 'path'
import { usePaint } from './paint'
import { Const } from './const'


export const RawCtx = Symbol('RawCtx')


export const Color = {
  white: '#ffffff',
  black: '#000000',
  light: '#aaaaaa',
}
export type Color = keyof typeof Color

export type Renderer = (img: {
  ctx: SKRSContext2D
  paint: ReturnType<typeof usePaint>
  width: number
  height: number
}) => void | Promise<void>

export const useImage = (ScreenWidth = Const.ScreenWidth, ScreenHeight = Const.ScreenHeight) => {
  const canvas = createCanvas(ScreenWidth, ScreenHeight)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, ScreenWidth, ScreenHeight)

  async function draw(renderer: Renderer, frameX?: number, frameY?: number, frameWidth?: number, frameHeight?: number) {
    const paint = usePaint(ctx, frameX, frameY, frameWidth, frameHeight)
    try {
      await renderer({
        ctx,
        paint,
        width: frameWidth ?? ScreenWidth,
        height: frameHeight ?? ScreenHeight
      })
    } catch (e) {
      console.error(e)
      paint
        .newRect(0, 0, frameWidth ?? ScreenWidth, frameHeight ?? ScreenHeight)
        .fill('checker')
      paint
        .newBitText('Render error: ' + (e as any).message)
        .at((frameWidth ?? ScreenWidth) / 2, (frameHeight ?? ScreenHeight) / 2)
        .anchor('center', 'center')
        .maxWidth((frameWidth ?? ScreenWidth) - 20)
        .useRect(r => r
          .inset(-10)
          .round(5)
          .fill('black')
        )
        .render('white')
    }
    paint.render(true)
  }

  /** render full as black and white, 1 bit per pixel */
  function renderFullBw() {
    const buff = Buffer.alloc(Math.ceil(ScreenWidth * ScreenHeight / 8))
    const imageData = ctx.getImageData(0, 0, ScreenWidth, ScreenHeight).data

    let byte = 0
    for (let i = 0; i < ScreenWidth * ScreenHeight; i += 8) {
      byte = 0
      for (let j = 0; j < 8; j++) {
        byte |= (imageData[(i+j)*4] >= 128 ? 1 : 0) << j
      }
      buff[~~(i/8)] = byte
    }
    return buff
  }

  /** render full as black and white, 1 bit per pixel */
  async function exportFullBw(filename?: string) {
    const exportCanvas = createCanvas(ScreenWidth, ScreenHeight)
    const exportCtx = exportCanvas.getContext('2d')

    const imageDataContainer = ctx.getImageData(0, 0, ScreenWidth, ScreenHeight)
    const imageData = imageDataContainer.data
    let val = 0
    for (let i = 0; i < ScreenWidth * ScreenHeight; i++) {
      val = imageData[i*4] >= 128 ? 255 : 0
      imageData[i*4] = val
      imageData[i*4+1] = val
      imageData[i*4+2] = val
    }

    exportCtx.putImageData(imageDataContainer, 0, 0)
    const exportPng = await exportCanvas.encode('png')
    if (filename)
      await promises.writeFile(join(import.meta.dirname, '..', '..', 'output', filename), exportPng)
    return exportPng
  }

  return {
    [RawCtx]: ctx,
    width: ScreenWidth,
    height: ScreenHeight,
    draw,
    renderFullBw,
    exportFullBw
  }
}
