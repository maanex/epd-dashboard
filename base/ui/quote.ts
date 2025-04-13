import type { Renderer } from "../lib/image"


export function drawQuote(): Renderer {
  return ({ paint, width, height }) => {
    const padding = 15
    const maxWidth = width - padding * 2

    paint.newRect(0, 0, width, height)
      .fill('white')

    const quote = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'

    // paint
    //   .newText('Heutige Botschaft')
    //   .maxWidth(170)
    //   .at(padding, padding)
    //   .anchor('left', 'top')
    //   .size(28)
    //   .font('Modak')
    //   .threshold(0.05)
    //   .render('black')

    paint.newRect()
      .from(padding, padding)
      .sized(maxWidth, height - padding*2)
      .round(2)
      .useCopy(r => r
        .translate(3, 3)
        .fill('light')
      )
      .fill('black')
      .inset(1)
      .fill('white')
  }
}
