import type { Renderer } from "../lib/image"
import { drawDitheredImage, loadAndDitherImage } from "../lib/imgdither"


type QuoteContent = {
  author: string
  text?: string
  image?: string
}

export function drawQuote(content: QuoteContent): Renderer {
  return async ({ paint, width, height }) => {
    const padding = 15
    const maxWidth = width - padding * 2
    const authorHeight = 28

    paint.newRect(0, 0, width, height)
      .fill('white')

    let contentWidth = maxWidth
    let contentHeight = height - padding * 2 - authorHeight
    let contentImage: Buffer | null = null

    if (content.image) {
      const { dithered, width: renderWidth, height: renderHeight } = await loadAndDitherImage(content.image, maxWidth - 3, height - padding*2 - authorHeight - 3)
      contentWidth = renderWidth + 2
      contentHeight = renderHeight + 2
      contentImage = dithered
    }
    const xShift = maxWidth - contentWidth
    const yShift = height - contentHeight - authorHeight - padding * 2

    const innerRect = paint.newRect()
      .from(padding + xShift, padding + yShift)
      .sized(contentWidth, contentHeight)
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

    paint.newBitText(content.author + Math.random())
      .at(width - padding * 4, height - padding + 5)
      .anchor('center', 'bottom')
      .size(12)
      .render('black')

    if (content.image) {
      paint.transform(padding + 1 + xShift, padding + 1 + yShift)
      await drawDitheredImage(contentImage!, contentWidth - 2, contentHeight - 2, paint, 5)
      paint.transform(-padding - 1 - xShift, -padding - 1 - yShift)
    } else {
      const textPadding = padding * 2
      paint.newBitText(content.text ?? '')
        .at(width/2, (height - authorHeight - padding*2) / 2 + padding)
        .anchor('center', 'center')
        .justify('center')
        .size('auto')
        .maxWidth(maxWidth - textPadding*2)
        .maxHeight(height - authorHeight - padding*2 - textPadding*2)
        .render('black')
    }
  }
}
