import express from "express"
import os from 'node:os'
import * as fs from 'fs/promises'
import { useWeatherApi } from "./api/weather"
import { useImage } from "./lib/image"
import { drawDayview } from "./ui/dayview"
import { GlobalFonts } from '@napi-rs/canvas'
import * as path from 'path'
import { Const } from "./lib/const"
import { calcQuoteContentWidth, drawQuote } from "./ui/quote"
import { drawDock } from "./ui/dock"
import { useGCalendarApi } from "./api/gcalendar"
import { drawCalendarAgenda } from "./ui/calendar"
import consola from "consola"
import { useHolidaysApi } from "./api/holidays"
import { runDiscordBot } from "./discord/bot"
import axios from "axios"


GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Modak-Regular.ttf'), 'Modak')
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'NotoSans.ttf'), 'NotoSans')
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Yarndings12-Regular.ttf'), 'Yarndings12')
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Yarndings20-Regular.ttf'), 'Yarndings20')


consola.start('Loading weather')
const weather = await useWeatherApi()
consola.success('Weather loaded')

consola.start('Loading gCalendar')
const calendar = await useGCalendarApi({
  // dummy: true,
  blacklist: [ /@group\.v\.calendar\.google\.com$/gi ]
})
consola.success('gCalendar loaded')

consola.start('Loading holidays')
const holidays = await useHolidaysApi()
consola.success('Holidays loaded')

consola.start('Starting Discord bot')
const disco = await runDiscordBot()
consola.success('Discord bot started')


function getSleepMinutes() {
  const drawingStopHour = 2
  const drawingStartHour = 6

  const now = new Date()
  const sleepMinutes = (now.getHours() >= drawingStopHour && now.getHours() < drawingStartHour)
    // minutes until 6am
    ? (drawingStartHour - now.getHours()) * 60 - now.getMinutes()
    // minutes until next full hour
    : (60 - now.getMinutes()) % 60

  // +1 minute so we don't accidentally get it at 10 seconds before next hour and render outdated data
  return Math.max(15, Math.min(60*4, Math.ceil(sleepMinutes + 1)))
}

async function drawScreen(localTemperature?: number | string) {
  await weather.assertRecentData().catch(consola.error)
  await calendar.assertRecentData().catch(consola.error)
  await holidays.assertRecentData().catch(consola.error)

  const img = useImage()

  const dayviewHeight = 100
  const dockHeight = 60
  const maxHorizontalSplit = 400
  let horizontalSplit = maxHorizontalSplit

  const totd = await fs.readFile(
    path.join(import.meta.dirname, '..', 'credentials', 'totd.json'),
    'utf-8'
  ).catch(() => null)
  const totdData = await Promise.try(() => JSON.parse(totd ?? '')).catch(() => null)

  await img.draw(
    drawDayview(weather),
    0, 0,
    Const.ScreenWidth, dayviewHeight
  )

  if (totdData) {
    await img.draw(
      drawQuote(totdData),
      maxHorizontalSplit, dayviewHeight,
      Const.ScreenWidth - maxHorizontalSplit, Const.ScreenHeight - dayviewHeight - dockHeight
    )
    horizontalSplit = Const.ScreenWidth - await calcQuoteContentWidth(
      totdData,
      Const.ScreenWidth - maxHorizontalSplit,
      Const.ScreenHeight - dayviewHeight - dockHeight
    )
  }

  img.draw(
    drawCalendarAgenda(calendar),
    0, dayviewHeight,
    horizontalSplit, Const.ScreenHeight - dayviewHeight - dockHeight
  )

  await img.draw(
    drawDock(weather, holidays, localTemperature),
    0, Const.ScreenHeight - dockHeight,
    Const.ScreenWidth, dockHeight
  )

  return img
}

const app = express()
app.get('/r', async (req, res) => {
  const log = `Request from ${req.ip} with ${Object.entries(req.query).map(([k, v]) => `${k}=${v}`).join(', ')} - ${getSleepMinutes()}min sleep`
  consola.info(log)
  axios.post('https://discord.com/api/webhooks/1391761563098026064/APLUcB5akmXunrJg_syptjtj96_cDY6zbjxoFzvO8lihaKV9q3e6ztBphR93S52UgE0y', { content: log, username: os.hostname() })

  const localTemperature = req.query.temp ? String(req.query.temp) : undefined
  const start = Date.now()
  const img = await drawScreen(localTemperature)
  const imgBuffer = await img.renderFullBw()
  consola.info(`Completed in ${Date.now() - start}ms`)

  const sleepBuffer = Buffer.from([ getSleepMinutes() ])
  res.send(Buffer.concat([ sleepBuffer, imgBuffer ]))
})
app.get('/', async (req, res) => {
  const log = `View from ${req.ip} with ${Object.entries(req.query).map(([k, v]) => `${k}=${v}`).join(', ')} - ${getSleepMinutes()}min sleep`
  consola.info(log)
  axios.post('https://discord.com/api/webhooks/1391761563098026064/APLUcB5akmXunrJg_syptjtj96_cDY6zbjxoFzvO8lihaKV9q3e6ztBphR93S52UgE0y', { content: log, username: os.hostname() })

  const localTemperature = req.query.temp ? String(req.query.temp) : undefined
  const start = Date.now()
  const img = await drawScreen(localTemperature)
  const imgBuffer = await img.exportFullBw()
  consola.info(`Completed in ${Date.now() - start}ms`)

  res.setHeader('Content-Type', 'image/png')
  res.send(imgBuffer)
})
app.get('/discord-manual', () => disco.badaboom())
app.listen(3034, '0.0.0.0', () => consola.log('Server is running on http://localhost:3034'))
