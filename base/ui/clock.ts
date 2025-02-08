import type { Renderer } from "../lib/image"


export function drawClock(height: number, offsetTop: number): Renderer {
  return ({ paint, width }) => {
    paint.transform(0, offsetTop)

    paint.newRect(0, 0, width, height)
      .fill('lightest')

    const rn = new Date()
    const text = `${rn.getHours().toString().padStart(2, '0')}:${rn.getMinutes().toString().padStart(2, '0')}`
    const shadowDist = 10

    paint
      .newText(text)
      .at(width / 2, (height) / 2)
      .anchor('center', 'center')
      .size(200)
      .font('Modak')
      .threshold(0.9)
      .translate(shadowDist, shadowDist)
      .render('dark', 'default', false)
      .translate(-shadowDist, -shadowDist)
      .renderOutline('black', 4)
      .renderOutline('white', 2)
      .render('medium', 'default', false)
  }
}
