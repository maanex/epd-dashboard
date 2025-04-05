import type { Renderer } from "../lib/image"


export function drawQuote(): Renderer {
  return ({ paint, width, height }) => {

    paint.newRect(0, 0, width, height)
      .fill('lightest')

    const shadowDist = 10

    // const quote = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'
    const quote = 'lorem ipsum dolor sit'

    const textPaint = paint
      .newText(quote)
      .maxWidth(170)
      .at(width / 2, (height) / 2)
      .anchor('center', 'center')
      .size(26)
      .font('Modak')
      .threshold(0.2)
      .render('black')

    paint.newRect(40, 60, 120, 190)
      .round(6)
      .fill('medium')
      .inset(1)
      .fill('white')

    // paint
    //   .newText('hui')
    //   .at(width / 2, (height) / 2)
    //   .anchor('center', 'center')
    //   .size(200)
    //   .font('Modak')
    //   .threshold(0.9)
    //   .translate(shadowDist, shadowDist)
    //   .render('dark')
    //   .translate(-shadowDist, -shadowDist)
    //   .renderOutline('black', 4)
    //   .renderOutline('white', 2)
    //   .render('medium')
  }
}
