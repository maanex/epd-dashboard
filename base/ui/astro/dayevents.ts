import type { GCalendarApi } from "../../api/gcalendar"
import { cFont } from "../../lib/c-font"
import type { Renderer } from "../../lib/image"
import type { FillStyle } from "../../lib/paint"


const firstHour = 6
const lastHour = 26
const outerRowHeight = 14
const rowPadding = 1
const extraPadding = 2
const background: FillStyle = 'lightest-shade'

export function drawDayevents(calendar: GCalendarApi): Renderer<{ usedHeight: number }> {
  return ({ paint, width, height }) => {
    const hourCount = (lastHour - firstHour)
    const hourWidth = width / hourCount

    // const almostToday = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const almostToday = new Date(Date.now())
    almostToday.setHours(firstHour, 0, 0, 0)
    const minimumTime = almostToday.getTime()
    const maximumTime = minimumTime + (lastHour - firstHour) * 60 * 60 * 1000

    const { events } = calendar.getData()
    const timedEvents = events.filter(event => {
      if (event.isAllDay)
        return false

      const startTime = event.start.getTime()
      if (startTime >= minimumTime && startTime <= maximumTime)
        return true
      const endTime = event.end.getTime()
      if (endTime >= minimumTime && endTime <= maximumTime)
        return true

      return false
    }).map(event => {
      const startHour = event.start.getHours() + event.start.getMinutes() / 60
      const endHour = event.end.getHours() + event.end.getMinutes() / 60
      
      const startX = Math.round((startHour - firstHour) * hourWidth)
      const endX = Math.round((endHour - firstHour) * hourWidth)

      const summaryWidth = event.summary.split('').filter(c => c in cFont.f12).join('').trim().length * 7 + 5 // 5 padding

      return {
        ...event,
        startX,
        endX,
        summaryWidth
      }
    })

    paint.newRect()
      .from(0, 0)
      .sized(width, extraPadding)
      .fill(background)

    const assignedRows = new Map<number, number>()
    let currentMaxRow = -1
    for (let i = 0; i < timedEvents.length; i++) {
      let blockedRows = new Set<number>()
      for (let j = 0; j < i; j++) {
        const other = timedEvents[j]
        if (other.endX + other.summaryWidth > timedEvents[i].startX && other.startX < timedEvents[i].endX + timedEvents[i].summaryWidth) {
          const assignedRow = assignedRows.get(j) ?? -1
          blockedRows.add(assignedRow)
        }
      }
      let assignedRow = 0
      while (blockedRows.has(assignedRow)) {
        assignedRow++
      }
      assignedRows.set(i, assignedRow)

      if (assignedRow > currentMaxRow) {
        currentMaxRow = assignedRow
        paint.newRect()
          .from(0, assignedRow * (outerRowHeight + rowPadding) + extraPadding)
          .sized(width, outerRowHeight + rowPadding)
          .fill(background)
      }

      const y = assignedRow * (outerRowHeight + rowPadding) + extraPadding
      const outerBoxWidth = timedEvents[i].endX - timedEvents[i].startX
      const innerBoxWidth = Math.max(outerBoxWidth - 2, 0)

      paint.newRect()
        .from(timedEvents[i].startX - 1, y - 1)
        .sized(outerBoxWidth + timedEvents[i].summaryWidth + 1, outerRowHeight + 1)
        .round(3)
        .fill('white')
      paint.newRect()
        .from(timedEvents[i].startX + 4, y + outerRowHeight - 1)
        .sized(outerBoxWidth + timedEvents[i].summaryWidth - 5, 1)
        .fill('black')

      paint.newRect()
        .from(timedEvents[i].startX - 1, y - 1)
        .sized(outerBoxWidth + 1, outerRowHeight + 1)
        .round(3)
        .fill('black')
        .inset(1)
        .round(2)
        .fill(timedEvents[i].end.getTime() < Date.now() ? 'white' : 'black')

      const start = timedEvents[i].start
      const end = timedEvents[i].end
      const timeString = (end.getTime() - start.getTime() <= 30 * 60 * 1000)
        ? ` `
        : (end.getTime() - start.getTime() < 2 * 60 * 60 * 1000)
          ? `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`
          : `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}-${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}`

      const balanceXOffset = (innerBoxWidth - timeString.length * 7) >= 2 ? 1 : 0
      paint.newBitText(timeString)
        .size(12)
        .at(timedEvents[i].startX + balanceXOffset + 1, y + 2)
        .maxWidth(innerBoxWidth - balanceXOffset * 2)
        .render('black', 'invert')

      paint.newBitText(timedEvents[i].summary)
        .size(12)
        .at(timedEvents[i].endX + 2, y + 2)
        .render('black')
    }

    if (currentMaxRow === -1) {
      currentMaxRow = 0
      paint.newRect()
        .from(0, extraPadding)
        .sized(width, outerRowHeight + rowPadding)
        .fill(background)
    }

    paint.newRect()
      .from(0, (currentMaxRow + 1) * (outerRowHeight + rowPadding) + extraPadding - 1)
      .sized(width, extraPadding)
      .fill(background)

    paint.newRect()
      .from(0, (currentMaxRow + 1) * (outerRowHeight + rowPadding) + extraPadding + 1)
      .sized(width, 2)
      .fill('black')

    const usedHeight = (currentMaxRow + 1) * (outerRowHeight + rowPadding) + extraPadding + 2 + 1

    return {
      usedHeight
    }
  }
}
