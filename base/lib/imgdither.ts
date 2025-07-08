import axios from "axios"
import sharp from "sharp"
import type { usePaint } from "./paint"
import path from "path"
import * as fs from 'fs/promises'


const bayerMatrix = [
  [  0,  8,  2, 10 ],
  [ 12,  4, 14,  6 ],
  [  3, 11,  1,  9 ],
  [ 15,  7, 13,  5 ]
]

export function orderedDither(imageData: Buffer, width: number, height: number) {
  const matrixSize = 4
  const matrixScale = 16

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
  const scaled = await sharp(data).resize({ width, height })
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
