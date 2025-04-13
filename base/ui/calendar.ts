import type { GCalendarApi } from "../api/gcalendar"
import { DatetimeUtils } from "../lib/datetime-utils"
import type { Renderer } from "../lib/image"


const defaultTaskListName = 'Meine Aufgaben'


export function drawCalendarAgenda(calendar: GCalendarApi): Renderer {
  return ({ paint, width, height }) => {
    const padding = 15
    const maxWidth = width - padding * 2

    paint.newRect(0, 0, width, height)
      .fill('white')

    paint
      .newText(new Date().toLocaleDateString('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).replace('.,', ','))
      .at(padding, padding)
      .anchor('left', 'top')
      .size(28)
      .font('Modak')
      .threshold(0.05)
      .render('black')

    const allDayers = calendar.events.filter(event => event.isToday && event.isAllDay)
    const timedEvents = calendar.events.filter(event => event.isToday && !event.isAllDay)

    let y = padding + 28 + 5
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
        .useRect(r => r
          .inset(-inset)
          .sized(r.getSize().width + 6, r.getSize().height - 1)
          .round(2)
          .useCopy(r => r
            .translate(3, 3)
            .fill('light')
          )
          .fill('black')
          .inset(1)
          .fill('white')
          .sized(6, null)
          .fill('medium', 'darken')
          .sized(1, null)
          .round(0)
          .translate(5, 0)
          .fill('black')
        )
        .translate(6, 0)
        .render('black')

      y += ~~(textEvent.toRect().getSize().height + inset*2 + 4)
    }

    if (allDayers.length && timedEvents.length)
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
        .useRect(r => r
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
        .useRect(r => r.fill('white'))
        .render('black')

      y += textEvent.toRect().getSize().height + 10
    }

    if ((allDayers.length || timedEvents.length) && calendar.tasks.length) {
      y += padding
      paint
        .newRect(padding, y, maxWidth, 1)
        .inset(0.5)
        .fill('medium')
      y += padding
    }

    for (let i = 0; i < 8; i++) {
      const task = calendar.tasks[i]
      if (!task) break

      const isInDefaultList = task.partOf.title === defaultTaskListName

      paint.newRect(padding, y-1, 12, 12)
        .round(2)
        .fill('black')
        .inset(1)
        .fill('white')

      const textTask = paint.newBitText((isInDefaultList ? '' : `${task.partOf.title!}: `) + (task.title ?? '(mystery task)'))
        .at(padding + 18, y)
        .size(12)
        .maxWidth(maxWidth - 18)
        .anchor('left', 'top')
        .render('black')

      y += textTask.toRect().getSize().height

      if (task.due) {
        const date = new Date(task.due)
        const delta = DatetimeUtils.renderDayDelta(date)
        const textDate = paint.newBitText('> ' + delta)
          .at(padding + 18, y + 2)
          .size(8)
          .maxWidth(maxWidth - 18)
          .anchor('left', 'top')
          .render('black')
        y += textDate.toRect().getSize().height + 2
      }

      y += 7
    }
  }
}
