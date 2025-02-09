import type { WeatherApi } from "../api/weather"
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
      .render('white')
      .toRect()
    return bounds.getSize().width
  },
]

export function drawBar(weather: WeatherApi): Renderer {
  return ({ paint, width, height }) => {
    paint.newRect(0, 0, width, height)
      .fill('black')

    const padding = 5
    paint.transform(padding*2, padding)
    for (const el of left) {
      const taken = el({ paint, height: height - padding*2, padding })
      paint.transform(taken + padding*2, -padding)
      paint.newRect(0, 0, 1, height).fill('medium')
      paint.transform(padding*2 + 1, padding)
    }

    paint.clearTransform()
    const numDays = 7
    const dayWidth = height - padding*2
    const dayPadding = 5
    const startX = width - numDays * (dayWidth + dayPadding) - dayPadding + padding
    paint.transform(startX, padding + height - height)

    // wettervorhersage für die nächsten 7 (idealerweise 10) tag + wochenende / feiertage
    for (let i = 0; i < numDays; i++) {
      // console.log(weather.getDay(i))
      paint
        .newRect(i * (dayWidth + dayPadding), 0, dayWidth, height - padding*2)
        .outline('light')
    }
  }
}
