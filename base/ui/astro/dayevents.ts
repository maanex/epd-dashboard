import type { GCalendarApi } from "../../api/gcalendar"
import type { Renderer } from "../../lib/image"
import type { FillStyle } from "../../lib/paint"


const firstHour = 6
const lastHour = 26
const outerRowHeight = 14
const rowPadding = 1
const extraPadding = 1
const background: FillStyle = 'medium'

export function drawDayevents(calendar: GCalendarApi): Renderer {
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

      return {
        ...event,
        startX,
        endX
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
        if (other.endX > timedEvents[i].startX && other.startX < timedEvents[i].endX) {
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
      paint.newRect()
        .from(timedEvents[i].startX - 1, y - 1)
        .sized(timedEvents[i].endX - timedEvents[i].startX + 1, outerRowHeight + 1)
        .round(2)
        .fill('black')
        .inset(1)
        .round(1)
        .fill('white')
        .useCopy(rect => {
          const { x, width } = rect.getSize()
          paint.newBitText(timedEvents[i].summary.toUpperCase())
            .size(12)
            .at(x + 2, y + 2)
            .maxWidth(width - 4)
            .render('black')
        })
    }

    paint.newRect()
      .from(0, (currentMaxRow + 1) * (outerRowHeight + rowPadding))
      .sized(width, extraPadding)
      .fill(background)

    // for (let i = 0; i < timedEvents.length; i++) {
    //   const event = timedEvents[i]
    //   const y = assignedRows.get(i)! * 6
    //   paint.newRect()
    //     .from(event.startX, y)
    //     .sized(event.endX - event.startX, 4)
    //     .outline('black', 1)
    // }

    // return used height!
  }
}
