import axios from "axios"
import sharp from "sharp"
import type { usePaint } from "./paint"


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
  const res = await axios({
    method: 'get',
    url,
    responseType: 'arraybuffer'
  })
  const data = res.data as Buffer
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

export async function loadDitherAndDrawImage(url: string, width: number, height: number, paint: ReturnType<typeof usePaint>) {
  const { dithered, width: renderWidth, height: renderHeight } = await loadAndDitherImage(url, width, height)
  const startX = (width - renderWidth) / 2
  const startY = (height - renderHeight) / 2

  for (let y = 0; y < renderHeight; y++) {
    for (let x = 0; x < renderWidth; x++) {
      const black = dithered[(y * renderWidth + x) * 3] > 128
      paint.setPixel(startX + x, startY + y, black ? 1 : 0)
    }
  }

}
