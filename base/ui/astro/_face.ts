import { useImage } from '../../lib/image'
import { drawDayview } from './dayview'
import { calcQuoteContentWidth, drawQuote, type QuoteContent } from './quote'
import { drawDock } from './dock'
import { drawCalendarAgenda } from './calendar'
import { Const } from '../../lib/const'
import type { WeatherApi } from '../../api/weather'
import type { GCalendarApi } from '../../api/gcalendar'
import type { HolidaysApi } from '../../api/holidays'



export async function createAstroFace(opts: {
  weather: WeatherApi,
  calendar: GCalendarApi,
  holidays: HolidaysApi,
  quote?: QuoteContent,
  localTemperature?: number | string
}) {
  const dayviewHeight = 130
  const maxHorizontalSplit = 400
  let horizontalSplit = maxHorizontalSplit
  const totdData = opts.quote

  const img = useImage()

  await img.draw(
    drawDayview(opts.weather),
    0, 0,
    Const.ScreenWidth, dayviewHeight
  )

  const totdFullscreen = Boolean(totdData && totdData.image && Const.FullscreenTriggerWords.includes(totdData.text?.toLowerCase() ?? ''))
  if (totdData) {
    if (totdFullscreen) {
      await img.draw(
        drawQuote(totdData, true),
        0, dayviewHeight,
        Const.ScreenWidth, Const.ScreenHeight - dayviewHeight
      )
    } else {
      await img.draw(
        drawQuote(totdData, false),
        maxHorizontalSplit, dayviewHeight,
        Const.ScreenWidth - maxHorizontalSplit, Const.ScreenHeight - dayviewHeight
      )
      horizontalSplit = Const.ScreenWidth - await calcQuoteContentWidth(
        totdData,
        Const.ScreenWidth - maxHorizontalSplit,
        Const.ScreenHeight - dayviewHeight
      )
    }
  }

  img.draw(
    drawCalendarAgenda(opts.calendar, totdFullscreen),
    0, dayviewHeight,
    totdFullscreen ? Const.ScreenWidth : horizontalSplit, Const.ScreenHeight - dayviewHeight
  )

  return img
}
