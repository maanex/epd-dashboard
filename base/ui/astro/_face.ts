import { useImage } from '../../lib/image'
import { drawDayview } from './dayview'
import { calcQuoteContentWidth, drawQuote, type QuoteContent } from './quote'
import { drawDock } from './dock'
import { drawCalendarAgenda } from './calendar'
import { Const } from '../../lib/const'
import type { WeatherApi } from '../../api/weather'
import type { GCalendarApi } from '../../api/gcalendar'
import type { HolidaysApi } from '../../api/holidays'
import { drawDayevents } from './dayevents'



export async function createAstroFace(opts: {
  weather: WeatherApi,
  calendar: GCalendarApi,
  holidays: HolidaysApi,
  quote?: QuoteContent,
  localTemperature?: number | string
}) {
  const dayviewHeight = 100
  const dayeventsHeight = 30
  const maxHorizontalSplit = 400
  let horizontalSplit = maxHorizontalSplit
  const totdData = opts.quote

  const img = useImage()

  await img.draw(
    drawDayview(opts.weather),
    0, 0,
    Const.ScreenWidth, dayviewHeight
  )
  await img.draw(
    drawDayevents(opts.calendar),
    0, dayviewHeight,
    Const.ScreenWidth, dayeventsHeight
  )

  const dayHeight = dayviewHeight + dayeventsHeight

  const totdFullscreen = Boolean(totdData && totdData.image && Const.FullscreenTriggerWords.includes(totdData.text?.toLowerCase() ?? ''))
  if (totdData) {
    if (totdFullscreen) {
      await img.draw(
        drawQuote(totdData, true),
        0, dayHeight,
        Const.ScreenWidth, Const.ScreenHeight - dayHeight
      )
    } else {
      await img.draw(
        drawQuote(totdData, false),
        maxHorizontalSplit, dayHeight,
        Const.ScreenWidth - maxHorizontalSplit, Const.ScreenHeight - dayHeight
      )
      horizontalSplit = Const.ScreenWidth - await calcQuoteContentWidth(
        totdData,
        Const.ScreenWidth - maxHorizontalSplit,
        Const.ScreenHeight - dayHeight
      )
    }
  }

  img.draw(
    drawCalendarAgenda(opts.calendar, totdFullscreen),
    0, dayHeight,
    totdFullscreen ? Const.ScreenWidth : horizontalSplit, Const.ScreenHeight - dayHeight
  )

  return img
}
