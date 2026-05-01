import { useImage } from '../../lib/image'
import { drawDayview } from './dayview'
import { calcQuoteContentSize, drawQuote, type QuoteContent } from './quote'
import { drawToday, type Badge } from './today'
import { Const } from '../../lib/const'
import type { WeatherApi } from '../../api/weather'
import type { GCalendarApi } from '../../api/gcalendar'
import type { HolidaysApi } from '../../api/holidays'
import { drawDayevents } from './dayevents'
import { fillBlack, getDayLengthMetrics } from './utils'
import type { VaultApi } from '../../api/vault'
import { drawUpcoming } from './upcoming'



export async function createAstroFace(opts: {
  weather: WeatherApi,
  calendar: GCalendarApi,
  holidays: HolidaysApi,
  vault: VaultApi,
  quote?: QuoteContent,
  localTemperature?: number | string,
}) {
  const hLineHeight = 2
  const dayviewHeight = 100
  const dayeventsMaxHeight = 70
  const widthsFullscreenTotd = [ 300, 0, 300 ]
  const widhtsInlineTotd = [ 200, 400, 200 ]

  const totdData = opts.quote

  const img = useImage()

  await img.draw(
    drawDayview(opts.weather),
    0, img.height - dayviewHeight,
    Const.ScreenWidth, dayviewHeight
  )
  await img.draw(
    fillBlack(),
    0, img.height - dayviewHeight - hLineHeight,
    Const.ScreenWidth, hLineHeight
  )

  const { usedHeight: dayeventsHeight } = await img.draw(
    drawDayevents(opts.calendar, true),
    0, img.height - dayviewHeight - dayeventsMaxHeight - hLineHeight,
    Const.ScreenWidth, dayeventsMaxHeight
  ) || { usedHeight: dayeventsMaxHeight }
  await img.draw(
    fillBlack(),
    0, img.height - dayviewHeight - dayeventsHeight - hLineHeight * 2,
    Const.ScreenWidth, hLineHeight
  )

  const dayHeight = dayviewHeight + dayeventsHeight + hLineHeight * 2

  const totdFullscreen = Boolean(totdData && totdData.image && Const.FullscreenTriggerWords.includes(totdData.text?.toLowerCase() ?? ''))
  let [ widthToday, widthQuote, widthUpcoming ] = totdFullscreen ? widthsFullscreenTotd : widhtsInlineTotd

  if (totdData) {
    if (totdFullscreen) {
      await img.draw(
        drawQuote(totdData, true),
        0, 0,
        Const.ScreenWidth, Const.ScreenHeight - dayHeight
      )
    } else {
      const quoteX = widthToday + (widthQuote - widthQuote) / 2
      const { usedWidth } = await img.draw(
        drawQuote(totdData, false),
        quoteX, 0,
        widthQuote, Const.ScreenHeight - dayHeight
      )
      const extraSpace = widthQuote - usedWidth
      widthQuote = usedWidth
      widthToday = Math.min(Math.floor(widthToday + extraSpace / 2), widthsFullscreenTotd[0])
      widthUpcoming = Math.min(Math.floor(widthUpcoming + extraSpace / 2), widthsFullscreenTotd[2])
    }
  }

  // Local temperature
  const badges: Badge[] = []
  if (opts.localTemperature) {
    badges.push({
      text: `${opts.localTemperature}°`,
      color: null
    })
  }

  // Day length
  const dayLengthMetrics = getDayLengthMetrics()
  badges.push({
    text: `${Math.floor(dayLengthMetrics.dayLength)}h${Math.floor((dayLengthMetrics.dayLength % 1) * 60)}m (+${dayLengthMetrics.dayChangeToday}/${dayLengthMetrics.dayChangeNextWeek > 0 ? '+' : ''}${dayLengthMetrics.dayChangeNextWeek})`,
    color: null
  })

  // Birthdays
  const birthdays = await opts.vault.getBirthdays()
  badges.push(...birthdays.map(b => ({
    text: `${b[0]} ${b[1]}!`,
    color: 'big-waves'
  } satisfies Badge)))

  img.draw(
    drawToday(opts.calendar, totdFullscreen, badges, (totdData && !totdData.image) || (widthToday < widthsFullscreenTotd[0])),
    0, 0,
    widthToday, Const.ScreenHeight - dayHeight
  )

  img.draw(
    drawUpcoming(opts.calendar, opts.holidays, opts.weather, totdFullscreen),
    Const.ScreenWidth - widthUpcoming, 0,
    widthUpcoming, Const.ScreenHeight - dayHeight
  )

  return img
}
