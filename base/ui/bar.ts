import { Easings } from "../lib/easings"
import type { Renderer } from "../lib/image"
import type { usePaint } from "../lib/paint"


type Element = (opts: {
  paint: ReturnType<typeof usePaint>,
  height: number
}) => number

const left: Element[] = [
  ({ paint, height }) => {
    const bounds = paint
      .newText('Huhuu')
      .anchor('left', 'bottom')
      .at(0, height)
      .render('white', 'default', true)
    return bounds.getSize().width
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
      const taken = el({ paint, height: barHeight - padding*2 })
      paint.transform(taken + padding, -padding)
      paint.newRect(0, 0, 1, barHeight).fill('medium')
      paint.transform(padding + 1, padding)
    }
  }
}
