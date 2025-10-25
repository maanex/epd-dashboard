import type { GCalendarApi } from "../api/gcalendar"
import { DatetimeUtils } from "../lib/datetime-utils"
import type { Renderer } from "../lib/image"
import type { usePaint } from "../lib/paint"


const defaultTaskListName = 'Meine Aufgaben'
const hsplit = 0.6
const maxAgendaWidth = 220
const maxTasksWidth = 180


function drawAgenda(calendar: ReturnType<GCalendarApi['getData']>, paint: ReturnType<typeof usePaint>, width: number, height: number, asOverlay: boolean) {
  const padding = 15
  const maxWidth = width - padding * 2

  paint
    .newText(new Date().toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).replace('.,', ','))
    .at(padding, padding)
    .anchor('left', 'top')
    .font('Modak')
    .size(28)
    .threshold(0.75)
    .renderOutline('white', 1)
    .render('white')
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
        .inset(-1)
        .fill('white')
        .inset(1)
        .round(2)
        .useCopy(r => !asOverlay && r
          .translate(3, 3)
          .fill('light', 'darken')
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
        .sized(r.getSize().width, r.getSize().height - 2)
        .round(4)
        .inset(-3)
        .fill('white')
        .inset(3)
        .round(2)
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
      .useRect(r => r
        .round(4)
        .inset(-4, -5)
        .translate(0, -1)
        .fill('white')
        .round(0)
        .useCopy(r2 => r2
          .translate(-2, 1)
          .sized(7, 4)
          .fill('white')
        )
        .useCopy(r3 => r3
          .sized(7, 4)
          .translate(-2, r.getSize().height - 4)
          .fill('white')
        )
      )
      .render('black')

    y += textEvent.toRect().getSize().height + 10
  }

  const upcoming = calendar.events
    .filter(event => event.isUpcoming && event.start.getTime() <= new Date().getTime() + 6 * 24 * 60 * 60 * 1000) // upcoming within 6 days
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  if (!upcoming.length || y >= height - padding)
    return

  y += padding - 10
  if (y < height / 4 - padding) {
    y = height / 4 + padding
  } else if (asOverlay) {
    y += padding * 2
  } else {
    paint
      .newRect(padding, y, maxWidth, 1)
      .inset(0.5)
      .fill('medium')
    y += padding
  }

  paint
    .newRect(padding - 1, y - 4, 25, height)
    .round(-4)
    .inset(-1)
    .fill('white')
    .inset(1)
    .fill('medium')

  let lastDate = ''
  let lastX = 0
  let connectToTop = false
  for (let i = 0; i < 12; i++) {
    if (y >= height - padding * 2) break
    const event = upcoming[i]
    if (!event) break

    const inset = 5
    let x = padding + inset

    const date = new Date(event.start).toLocaleDateString('de-DE', { weekday: 'short' })
    if (date !== lastDate) {
      const textTime = paint.newBitText(date)
        .at(x, y)
        .size(12)
        .anchor('left', 'top')
        .useRect(r => {
          paint
            .newRect(padding + 1, y - 2, 21, r.getSize().height + 1)
            .round(-2)
            .fill('white')
        })
        .render('black')

      const width = textTime.toRect().getSize().width + inset + 5
      x += width
      lastDate = date
      lastX = width
      connectToTop = false
    } else {
      x += lastX
      y -= 11
      connectToTop = true
    }

    const textEvent = paint.newBitText(event.summary)
      .maxWidth(maxWidth - x + padding)
      .at(x, y)
      .size(12)
      .anchor('left', 'top')
      .useRect(r => {
        r
          .translate(0, -1)
          .round(-2)
          .inset(-4, -2)
          .fill('white')
        if (connectToTop)
          r.translate(0, -3)
            .round(-1)
            .fill('white')
      })
      .render('black')

    y += textEvent.toRect().getSize().height + 15
  }
}

function drawTasks(calendar: ReturnType<GCalendarApi['getData']>, paint: ReturnType<typeof usePaint>, width: number, height: number, asOverlay: boolean) {
  const outerPadding = 10
  const innerPadding = 10
  const rightPadding = 5
  const maxWidth = width - rightPadding - innerPadding * 2

  paint.newRect()
    .from(0, outerPadding)
    .sized(width - rightPadding, height - outerPadding * 2)
    .round(5)
      .useCopy(r => r
        .translate(3, 3)
        .fill('light', 'darken')
      )
      .fill('black')
      .inset(1)
      .fill('white')

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  let previousWasHighlighted = false
  let y = outerPadding + innerPadding + 1
  for (let i = 0; i < 8; i++) {
    const task = calendar.tasks[i]
    if (!task) break

    if (task.due && new Date(task.due).getTime() < endOfToday.getTime()) {
      previousWasHighlighted = true
    } else if (previousWasHighlighted) {
      paint.newRect(1, y, width - rightPadding - 2, 1)
        .fill('black')
      y += 10
      previousWasHighlighted = false
    }

    const isInDefaultList = task.partOf.title === defaultTaskListName

    paint.newRect(innerPadding, y-1, 12, 12)
      .round(2)
      .fill('black')
      .inset(1)
      .fill('white')

    const textTask = paint.newBitText((isInDefaultList ? '' : `${task.partOf.title!}: `) + (task.title ?? '(mystery task)'))
      .at(innerPadding + 18, y)
      .size(12)
      .maxWidth(maxWidth - 18)
      .anchor('left', 'top')
      .render('black')

    y += textTask.toRect().getSize().height

    if (task.due) {
      const date = new Date(task.due)
      const delta = DatetimeUtils.renderDayDelta(date)
      const textDate = paint.newBitText('> ' + delta)
        .at(innerPadding + 18, y + 2)
        .size(8)
        .maxWidth(maxWidth - 18)
        .anchor('left', 'top')
        .render('black')
      y += textDate.toRect().getSize().height + 2
    }

    y += 7
  }
}

function drawQRCode(calendarApi: GCalendarApi, paint: ReturnType<typeof usePaint>, width: number, height: number) {
  const qr = calendarApi.generateAuthUrl()
  paint.newRect(0, 0, width, height)
    .fill('checker')
    .fill('medium', 'lighten')
    .inset(10)
    .fill('white')
  paint.newQrcode(qr)
    .at(width / 2, height / 2)
    .scale(3)
    .anchor('center', 'center')
    .render('black')
}

export function drawCalendarAgenda(calendarApi: GCalendarApi, asOverlay: boolean): Renderer {
  return ({ paint, width, height }) => {
    if (calendarApi.isSignedOut) {
      drawQRCode(calendarApi, paint, width, height)
      return
    }

    if (!asOverlay) {
      paint.newRect(0, 0, width, height)
        .fill('white')
    }

    const calendar = calendarApi.getData()
    if (calendar.tasks.length) {
      const agendaWidth = Math.min(Math.floor(width * hsplit), maxAgendaWidth)
      drawAgenda(calendar, paint, agendaWidth, height, asOverlay)
      const tasksPotentialWidth = Math.ceil(width * (1 - hsplit))
      const tasksActualWidth = Math.min(tasksPotentialWidth, maxTasksWidth)
      paint.transform(width - tasksActualWidth - (asOverlay ? 5 : 0), 0)
      drawTasks(calendar, paint, tasksActualWidth, height, asOverlay)
    } else {
      drawAgenda(calendar, paint, Math.min(width, maxAgendaWidth), height, asOverlay)
    }
  }
}
