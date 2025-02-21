import type { Renderer } from "../lib/image"


export function drawClock(): Renderer {
  return ({ paint, width, height }) => {

    paint.newRect(0, 0, width, height)
      .fill('lightest')

    const rn = new Date(Date.now())
    const text = `${rn.getHours().toString().padStart(2, '0')}:${rn.getMinutes().toString().padStart(2, '0')}`
    const shadowDist = 10

    /* This renders the clock centered in the middle of the screen
     * This looks great but it means partial updates most often have
     * to update the whole text as the font is not monospaced
     */
    paint
      .newText(text)
      .at(width / 2, (height) / 2)
      .anchor('center', 'center')
      .size(200)
      .font('Modak')
      .threshold(0.9)
      .translate(shadowDist, shadowDist)
      .render('dark')
      .translate(-shadowDist, -shadowDist)
      .renderOutline('black', 4)
      .renderOutline('white', 2)
      .render('medium')
  }
}
