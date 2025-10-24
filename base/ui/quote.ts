import type { Renderer } from "../lib/image"
import { drawDitheredImage, loadAndDitherImage } from "../lib/imgdither"


type QuoteContent = {
  author: string
  text?: string
  image?: string
}

const padding = 10
// const authorHeight = 18

export function drawQuote(content: QuoteContent): Renderer {
  return async ({ paint, width, height }) => {
    const maxWidth = width - padding * 2

    paint.newRect(0, 0, width, height)
      .fill('white')

    let contentWidth = maxWidth
    let contentHeight = height - padding * 2
    let contentImage: Buffer | null = null

    if (content.image) {
      const { dithered, width: renderWidth, height: renderHeight } = await loadAndDitherImage(content.image, maxWidth - 3, height - padding*2 - 2)
      contentWidth = renderWidth + 2
      contentHeight = renderHeight + 2
      contentImage = dithered
    }
    const xShift = maxWidth - contentWidth
    const yShift = height - contentHeight - padding * 2

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

    // paint.newTriangle()
    //   .at(width - padding * 4, height - padding - authorHeight + 3)
    //   .size(6)
    //   .stretch(1.8)
    //   .rotate(180)
    //   .translate(3, 3)
    //   .fill('light')
    //   .translate(-3, -3)
    //   .fill('black')
    //   .translate(0, -1)
    //   .fill('white')

    // innerRect.fill('white')

    // paint.newBitText(content.author)
    //   .at(width - padding * 4, height - padding + 9)
    //   .anchor('center', 'bottom')
    //   .size(12)
    //   .render('black')

    if (content.image) {
      paint.transform(padding + 1 + xShift, padding + 1 + yShift)
      await drawDitheredImage(contentImage!, contentWidth - 2, contentHeight - 2, paint, 5)
      paint.transform(-padding - 1 - xShift, -padding - 1 - yShift)
    } else {
      const textPadding = padding * 2
      paint.newBitText(content.text ?? '')
        .at(width/2, (height - padding*2) / 2 + padding)
        .anchor('center', 'center')
        .justify('center')
        .size('auto')
        .maxWidth(maxWidth - textPadding*2)
        .maxHeight(height - padding*2 - textPadding*2)
        .render('black')
    }

    paint.newBitText('@' + content.author)
      .at(width - padding * 2, height - padding * 2 + 2)
      .anchor('right', 'bottom')
      .size(12)
      .useRect(r => r
        .translate(0, -1)
        .inset(-6, -4)
        .round(-3)
        .fill('black')
        .inset(1)
        .fill('white')
      )
      .render('black')
  }
}

export async function calcQuoteContentWidth(content: QuoteContent, maxWidth: number, height: number) {
  if (!content.image)
    return maxWidth
  const { width } = await loadAndDitherImage(content.image, maxWidth - 3, height - padding*2)
  return Math.min(maxWidth, width + padding * 2)
}
