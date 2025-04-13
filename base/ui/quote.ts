import type { Renderer } from "../lib/image"


type QuoteContent = {
  author: string
  text?: string
  image?: string
}

export function drawQuote(content: QuoteContent): Renderer {
  return ({ paint, width, height }) => {
    const padding = 15
    const maxWidth = width - padding * 2
    const authorHeight = 28

    paint.newRect(0, 0, width, height)
      .fill('white')

    const innerRect = paint.newRect()
      .from(padding, padding)
      .sized(maxWidth, height - padding*2 - authorHeight)
      .round(5)
      .useCopy(r => r
        .translate(3, 3)
        .fill('light')
      )
      .fill('black')
      .inset(1)
      .fill('white')

    paint.newTriangle()
      .at(width - padding * 4, height - padding - authorHeight + 3)
      .size(10)
      .stretch(1.8)
      .rotate(180)
      .translate(3, 3)
      .fill('light')
      .translate(-3, -3)
      .fill('black')
      .translate(0, -1)
      .fill('white')

    innerRect.fill('white')

    paint.newBitText(content.author)
      .at(width - padding * 4, height - padding + 5)
      .anchor('center', 'bottom')
      .size(12)
      .render('black')

    if (content.image) {
    } else {
      const textPadding = padding * 2
      paint.newBitText(content.text ?? '')
        .at(width/2, (height - authorHeight - padding*2) / 2 + padding)
        .anchor('center', 'center')
        .size('auto')
        .maxWidth(maxWidth - textPadding*2)
        .maxHeight(height - authorHeight - padding*2 - textPadding*2)
        .render('black')
    }
  }
}
