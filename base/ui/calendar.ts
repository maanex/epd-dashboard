import type { GCalendarApi } from "../api/gcalendar"
import type { Renderer } from "../lib/image"


export function drawCalendarUpcoming(calendar: GCalendarApi): Renderer {
  return ({ paint, width, height }) => {

    paint.newRect(0, 0, width, height)
      .fill('white')

    const textPaint = paint
      .newText('Today')
      .at(20, 20)
      .anchor('left', 'top')
      .size(26)
      .font('Modak')
      .threshold(0.2)
      .render('black')

    // paint.newRect(40, 60, 120, 190)
    //   .round(6)
    //   .fill('medium')
    //   .inset(1)
    //   .fill('white')

    let y = 60
    for (let i = 0; i < 5; i++) {
      const event = calendar.upcoming[i]
      if (!event) break

      const start = new Date(event.start).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      const timeText = paint.newBitText(start)
        .maxWidth(500)
        .at(20, y)
        .size(12)
        .getRect(r => r
          .inset(-2)
          .translate(0, -2)
          .fill('black')
        )
        .anchor('left', 'top')
        .render('white')
        .toRect()

      const nameText = paint.newBitText(event.summary)
        .maxWidth(150)
        .at(20 + timeText.getSize().width + 10, y)
        .size(12)
        .anchor('left', 'top')
        .render('black')
        .toRect()

      y += nameText.getSize().height + 10
    }

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
