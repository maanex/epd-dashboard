import type { Renderer } from "../../lib/image"
import { drawDitheredImage, loadAndDitherImage } from "../../lib/imgdither"


export type QuoteContent = {
  author: string
  text?: string
  image?: string
}

const padding = 10

export function drawQuote(content: QuoteContent, fullscreen: boolean): Renderer<{ usedWidth: number }> {
  return async ({ paint, width, height }) => {
    paint.newRect(0, 0, width, height)
      .fill('white')

    let authorOutside = true
    let usedWidth = width

    if (fullscreen && content.image) {
      const { dithered } = await loadAndDitherImage(content.image, width, height, 'cover', 'error-diffusion')
      await drawDitheredImage(dithered, width, height, paint)
    } else {
      const maxWidth = width - padding * 2
      const maxHeight = height - padding * 2

      let contentWidth = maxWidth
      let contentHeight = maxHeight
      let contentImage: Buffer | null = null

      if (content.image) {
        const { dithered, width: renderWidth, height: renderHeight } = await loadAndDitherImage(content.image, maxWidth - 3, maxHeight - 3, 'contain', 'error-diffusion')
        contentWidth = renderWidth + 2
        contentHeight = renderHeight + 2
        contentImage = dithered
      }
      const xShift = Math.round((maxWidth - contentWidth) / 2)
      const yShift = Math.round((maxHeight - contentHeight) / 2)
      usedWidth = contentWidth

      paint.newRect()
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

      if (content.image) {
        paint.transform(padding + 1 + xShift, padding + 1 + yShift)
        await drawDitheredImage(contentImage!, contentWidth - 2, contentHeight - 2, paint, 5)
        paint.transform(-padding - 1 - xShift, -padding - 1 - yShift)
        authorOutside = yShift > padding + 6
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
        authorOutside = false
      }
    }

    paint.newBitText('@' + content.author)
      .at(
        width / 2,
        authorOutside ? (height - padding + 2) : (height - padding * 2 + 2)
      )
      .anchor(
        'center',
        'bottom'
      )
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

    return { usedWidth }
  }
}

export async function calcQuoteContentSize(content: QuoteContent, maxWidth: number, maxHeight: number) {
  if (!content.image)
    return [ maxWidth, maxHeight ]
  const { width, height } = await loadAndDitherImage(content.image, maxWidth - padding * 2, maxHeight - padding * 2, 'contain', 'error-diffusion')
  return [
    width,
    height
  ]
}
