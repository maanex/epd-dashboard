import type { GCalendarApi } from "../../api/gcalendar"
import type { Renderer } from "../../lib/image"


const firstHour = 6
const lastHour = 26

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

    const assignedRows = new Map<number, number>()
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
    }

    for (let i = 0; i < timedEvents.length; i++) {
      const event = timedEvents[i]
      const y = assignedRows.get(i)! * 6
      paint.newRect()
        .from(event.startX, y)
        .sized(event.endX - event.startX, 4)
        .outline('black', 1)
    }

    // return used height!
  }
}
