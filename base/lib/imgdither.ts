import axios from "axios"
import sharp from "sharp"
import type { usePaint } from "./paint"
import path from "path"
import * as fs from 'fs/promises'

const bayerMatrix = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
]
const matrixSize = 8
const matrixScale = 64


export function orderedDither(imageData: Buffer, width: number, height: number) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      const gray = 0.3 * imageData[i] + 0.59 * imageData[i+1] + 0.11 * imageData[i+2]
      const threshold = bayerMatrix[y % matrixSize][x % matrixSize] * 255 / matrixScale
      const value = gray > threshold ? 255 : 0
      imageData[i] = imageData[i+1] = imageData[i+2] = value
    }
  }

  return imageData
}

export async function loadAndDitherImage(url: string, maxWidth: number, maxHeight: number) {
  let data: Buffer
  if (!url.startsWith('http')) {
    // local file
    data = await fs.readFile(
      path.join(import.meta.dirname, '..', '..', 'credentials', 'cache', url)
    )
  } else {
    // remote file
    const res = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer'
    })
    data = res.data as Buffer
  }

  const meta = await sharp(data).metadata()
  const xAdjust = maxWidth / meta.width!
  const yAdjust = maxHeight / meta.height!
  const adjust = Math.min(xAdjust, yAdjust)
  const width = ~~(adjust * meta.width!)
  const height = ~~(adjust * meta.height!)
  const scaled = await sharp(data)
    .resize(width, height, { kernel: 'lanczos3' })
    .modulate({ brightness: 1.1, saturation: 1.1 })
    .sharpen(1, 1, 3)
  const dithered = orderedDither(await scaled.removeAlpha().raw().toBuffer(), width, height)
  return { dithered, width, height }
}

function checkBr(x: number, y: number, rectW: number, rectH: number, br: number) {
  if (br === 0)
    return false

  const dTop = y
  const dBottom = rectH - y
  const dLeft = x
  const dRight = rectW - x

  if (br > 0) {
    if (Math.sqrt(dTop**2 * dLeft**2) < br) return true
    if (Math.sqrt(dTop**2 * dRight**2) < br) return true
    if (Math.sqrt(dBottom**2 * dLeft**2) < br) return true
    if (Math.sqrt(dBottom**2 * dRight**2) < br) return true
  } else {
    if (Math.sqrt(dTop**3 * dLeft**3) < br**2) return true
    if (Math.sqrt(dTop**3 * dRight**3) < br**2) return true
    if (Math.sqrt(dBottom**3 * dLeft**3) < br**2) return true
    if (Math.sqrt(dBottom**3 * dRight**3) < br**2) return true
  }
  return false
}

export async function drawDitheredImage(buffer: Buffer, width: number, height: number, paint: ReturnType<typeof usePaint>, round = 0) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const black = buffer[(y * width + x) * 3] > 128
      if (round !== 0 && checkBr(x, y, width, height, round))
        continue
      paint.setPixel(x, y, black ? 1 : 0)
    }
  }
}
