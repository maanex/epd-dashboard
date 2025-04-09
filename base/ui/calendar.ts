import type { GCalendarApi } from "../api/gcalendar"
import type { Renderer } from "../lib/image"


export function drawCalendarUpcoming(calendar: GCalendarApi): Renderer {
  return ({ paint, width, height }) => {
    const padding = 15
    const maxWidth = width - padding * 2

    paint.newRect(0, 0, width, height)
      .fill('white')
    paint.newRect(width - 2, 0, 2, height)
      .fill('black')

    const textPaint = paint
      .newText('Today')
      .at(padding, padding)
      .anchor('left', 'top')
      .size(28)
      .font('Modak')
      .threshold(0.05)
      .render('black')

    const allDayers = calendar.data.filter(event => event.isToday && event.isAllDay)
    const timedEvents = calendar.data.filter(event => event.isToday && !event.isAllDay)

    let y = textPaint.toRect().getSize().height + padding + 10
    for (let i = 0; i < 6; i++) {
      const event = allDayers[i]
      if (!event) break

      let title = event.summary
      if (event.isMultiDay)
        title += ` (${event.multiDayCurrent + 1}/${event.multiDayCount})`

      const inset = 5
      const textEvent = paint.newBitText(title)
        .maxWidth(maxWidth - inset * 2)
        .at(padding, y)
        .size(12)
        .anchor('left', 'top')
        .translate(inset, inset)
        .getRect(r => r
          .inset(-inset)
          .sized(r.getSize().width + 6, r.getSize().height - 1)
          .round(2)
          .translate(3, 3)
          .fill('light')
          .translate(-3, -3)
          .fill('black')
          .inset(1)
          .fill('white')
          .sized(6, r.getSize().height)
          .fill('medium', 'darken')
          .sized(1, r.getSize().height)
          .round(0)
          .translate(5, 0)
          .fill('black')
        )
        .translate(6, 0)
        .render('black')

      y += ~~(textEvent.toRect().getSize().height + inset*2 + 4)
    }

    y += padding

    for (let i = 0; i < 12; i++) {
      const event = timedEvents[i]
      if (!event) break

      const start = new Date(event.start).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

      const inset = 3
      let x = padding + inset
      const textTime = paint.newBitText(start)
        .at(x, y)
        .size(12)
        .anchor('left', 'top')
        .getRect(r => r
          .inset(-inset)
          .round(2)
          .sized(r.getSize().width, r.getSize().height - 2)
          .fill('black')
          .inset(1)
          .fill(event.isOver ? 'white' : 'black')
        )
        .render(event.isOver ? 'black' : 'white')

      x += textTime.toRect().getSize().width + inset + 5

      const textEvent = paint.newBitText(event.summary)
        .maxWidth(maxWidth - x + padding)
        .at(x, y)
        .size(12)
        .anchor('left', 'top')
        .getRect(r => r.fill('white'))
        .render('black')

      y += textEvent.toRect().getSize().height + 10
    }

    // let y = 60
    // for (let i = 0; i < 10; i++) {
    //   const event = calendar.list[i]
    //   if (!event) break

    //   const start = new Date(event.start).toLocaleTimeString('de-DE', {
    //     hour: '2-digit',
    //     minute: '2-digit',
    //     hour12: false,
    //   })
    //   const timeText = paint.newBitText(start)
    //     .maxWidth(500)
    //     .at(20, y)
    //     .size(12)
    //     .getRect(r => r
    //       .inset(-2)
    //       .translate(0, -2)
    //       .fill(allDay ? 'medium' : (over ? 'white' : 'black'))
    //       .outline(allDay ? 'medium' : 'black')
    //     )
    //     .anchor('left', 'top')

    //   if (!allDay)
    //     timeText.render(over ? 'black' : 'white')

    //   const nameText = paint.newBitText(event.summary)
    //     .maxWidth(150)
    //     .at(20 + timeText.toRect().getSize().width + 10, y)
    //     .size(12)
    //     .anchor('left', 'top')
    //     .render('black')
    //     .toRect()

    //   y += nameText.getSize().height + 10
    // }

  }
}
