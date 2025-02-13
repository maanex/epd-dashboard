import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas"
import { promises } from 'fs'
import { join } from 'path'


export namespace ImgDebug {

  export async function renderBits(bits: Buffer, width: number, height: number) {
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    for (let i = 0; i < width * height; i++) {
      const byte = bits[~~(i/8)]
      const bit = (byte >> (i % 8)) & 1
      data[i*4] = data[i*4+1] = data[i*4+2] = bit * 255
      data[i*4+3] = 255
    }
    ctx.putImageData(imageData, 0, 0)
    const exportPng = await canvas.encode('png')
    await promises.writeFile(join(import.meta.dirname, '..', '..', 'output', 'debug.png'), exportPng)
  }

}
