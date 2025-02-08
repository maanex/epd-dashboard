import { Easings } from "../lib/easings"
import type { Renderer } from "../lib/image"
import type { usePaint } from "../lib/paint"


type Element = (opts: {
  paint: ReturnType<typeof usePaint>,
  height: number
  padding: number
}) => number


const left: Element[] = [
  ({ paint, height, padding }) => {
    paint.newTriangle(height/2, height/2 + 2, height/2)
      .fill('white')
    paint.newTriangle(height/2 + padding + height, height/2 - 2, height/2)
      .rotate(180)
      .fill('white')
    paint.newTriangle(height/2 + padding*2 + height*2, height/2, height/2)
      .rotate(90)
      .fill('white')
    return height * 3 + padding * 2
  },
  ({ paint, height }) => {
    const bounds = paint
      .newText('hehehehehehe :3')
      .anchor('left', 'bottom')
      .at(0, height)
      .render('white', 'default', true)
    return bounds.getSize().width
  },
]

export function drawBar(barHeight = 50): Renderer {
  return ({ paint, width, height }) => {
    paint.transform(0, height - barHeight)

    paint.newRect(0, 0, width, height)
      .fill('black')

    const padding = 5
    paint.transform(padding, padding)
    for (const el of left) {
      const taken = el({ paint, height: barHeight - padding*2, padding })
      paint.transform(taken + padding, -padding)
      paint.newRect(0, 0, 1, barHeight).fill('medium')
      paint.transform(padding + 1, padding)
    }
  }
}
