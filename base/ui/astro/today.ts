import type { GCalendarApi } from "../../api/gcalendar"
import { cFont } from "../../lib/c-font"
import { DatetimeUtils } from "../../lib/datetime-utils"
import type { Renderer } from "../../lib/image"
import type { FillStyle, usePaint } from "../../lib/paint"
import { calendarIdToFillStyle } from "./utils"


const defaultTaskListName = 'Meine Aufgaben'

export type Badge = {
  text: string
  color: FillStyle | null
}

function drawAgenda(calendar: ReturnType<GCalendarApi['getData']>, paint: ReturnType<typeof usePaint>, width: number, height: number, asOverlay: boolean, badges: Badge[], xConnecting: boolean) {
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
    .size(32)
    .threshold(0.75)
    .renderOutline('white', 1)
    .render('white')
    .threshold(0.05)
    .render('black')

  const allDayers = calendar.events.filter(event => event.isToday && event.isAllDay)
  badges.push(...allDayers.filter(Boolean).map(event => {
    let title = event.summary || '?'
    if (event.isMultiDay)
      title += ` (${event.multiDayCurrent + 1}/${event.multiDayCount})`

    return {
      text: title,
      color: calendarIdToFillStyle(event.calendar.id)
    } satisfies Badge
  }))

  const badgeInset = 5
  const badgePadding = 5
  const colorStripWidth = 6

  let y = padding + 32 + badgePadding

  let currentX = padding
  let addY = 0
  for (const badge of badges) {
    const textBox = paint.newBitText(badge.text)
      .size(12)
      .maxWidth(maxWidth - badgeInset * 2)

    const size = textBox.toRect().getSize()
    const badgeWidth = size.width + badgeInset * 2 + (badge.color ? colorStripWidth : 0)
    const badgeHeight = size.height + badgeInset * 2

    if (size.height > 20 || currentX + badgeWidth > maxWidth) { // new line
      currentX = padding
      y += addY
      addY = 0
    }

    paint.newRect(currentX, y, badgeWidth, badgeHeight)
      .round(4)
      .inset(-2)
      .fill('white')
      .round(2)
      .inset(2)
      .useCopy(r => !asOverlay && r
        .translate(3, 3)
        .fill('light', 'darken')
      )
      .fill('black')
      .inset(1)
      .fill('white')
      .breakIf(!badge.color)
      .sized(badgePadding, null)
      .fill(badge.color!, 'darken')
      .sized(1, null)
      .round(0)
      .translate(5, 0)
      .fill('black')

    textBox
      .at(currentX + badgeInset + (badge.color ? colorStripWidth : 0), y + badgeInset + 1)
      .anchor('left', 'top')
      .render('black')

    addY = Math.max(addY, badgeHeight + badgePadding)
    if (size.height > 20) {
      y += addY
      addY = 0
    } else {
      currentX += badgeWidth + badgePadding
    }
  }
  y += addY - badgePadding

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  let previousWasHighlighted = false
  let previousWidth = 0

  y += padding

  for (let i = 0; i < 8; i++) {
    const task = calendar.tasks[i]
    if (!task) break

    const isInDefaultList = task.partOf.title === defaultTaskListName
    const taskTitle = (isInDefaultList ? '' : `${task.partOf.title!}: `) + (task.title ?? '(mystery task)')
    let currentWidth = Math.min(maxWidth - 18, taskTitle.length * cFont.f12.width)

    if (task.due && new Date(task.due).getTime() < endOfToday.getTime()) {
      previousWasHighlighted = true
    } else if (previousWasHighlighted) {
      y += 5
      const x = xConnecting ? 0 : padding
      const w = xConnecting
        ? width
        : asOverlay
          ? Math.max(previousWidth, currentWidth) + 20
          : width - padding

      if (asOverlay) {
        paint.newRect(x, y, w - 1, 1)
          .inset(-2)
          .fill('white')
      }
      paint.newRect(x, y, w, 1)
        .fill('medium')
      y += 15
      previousWasHighlighted = false
    }

    const dueText = task.due
      ? `> ${DatetimeUtils.renderDayDelta(new Date(task.due))}`
      : ''
    const dueHeight = task.due
      ? paint.newBitText(dueText).size(8).toRect().getSize().height + 2
      : 0

    const textTask = paint.newBitText(taskTitle)
      .at(padding + 18, y)
      .size(12)
      .maxWidth(maxWidth - 18)
      .anchor('left', 'top')
      .useRect(r => r
        .round(4)
        .inset(-4, -2)
        .sized(r.getSize().width + 16, r.getSize().height + dueHeight)
        .translate(-16, -1)
        .fill('white')
      )
      .render('black')

    paint.newRect(padding, y-1, 12, 12)
      .round(2)
      .fill('black')
      .inset(1)
      .fill('white')

    y += textTask.toRect().getSize().height
    previousWidth = currentWidth

    if (task.due) {
      const textDate = paint.newBitText(dueText)
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

export function drawToday(calendarApi: GCalendarApi, asOverlay: boolean, badges: Badge[], xConnecting: boolean): Renderer<void> {
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
    drawAgenda(calendar, paint, width, height, asOverlay, badges, xConnecting)
  }
}
