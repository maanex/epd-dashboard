import type { Renderer } from "../lib/image"


export function drawFog(): Renderer {
  return ({ paint, width, height }) => {
    paint.newRect(0, 0, width, height)
      .fill('checker')
      .fill('medium', 'lighten')
      .inset(5)
      .fill('lightest')
      .fill('checker', 'lighten')
      .fill('dark', 'lighten')
  }
}
