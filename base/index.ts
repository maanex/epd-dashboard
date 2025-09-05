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
import { DatetimeUtils } from "./lib/datetime-utils"
import { ImgDiff } from "./lib/imgdiff"
import { useHomeioApi } from "./api/homeio"
import { drawFog } from "./ui/fog"
import http from 'http'
import https from 'https'


// Register global fonts
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Modak-Regular.ttf'), 'Modak')
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'NotoSans.ttf'), 'NotoSans')
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Yarndings12-Regular.ttf'), 'Yarndings12')
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Yarndings20-Regular.ttf'), 'Yarndings20')


// Initialize APIs and load data
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

consola.start('Loading homeio')
const homeio = await useHomeioApi()
consola.success('Homeio loaded')

consola.start('Starting Discord bot')
const disco = await runDiscordBot()
consola.success('Discord bot started')


// Eepy???
function getSleepMinutes() {
  const drawingStopHour = 2
  const drawingStartHour = 6

  const now = new Date()
  const sleepMinutes = (now.getHours() >= drawingStopHour && now.getHours() < drawingStartHour)
    // minutes until 6am
    ? (drawingStartHour - now.getHours()) * 60 - now.getMinutes()
    // minutes until next 5 minute mark
    : (((60 - now.getMinutes()) % 5) + 5) % 10
      // // minutes until next full hour
      // : (60 - now.getMinutes()) % 60

  return Math.max(5, Math.min(60*4, Math.ceil(sleepMinutes)))
}


// Rendering!
async function drawScreen(localTemperature?: number | string) {
  await weather.assertRecentData().catch(consola.error)
  await calendar.assertRecentData().catch(consola.error)
  await holidays.assertRecentData().catch(consola.error)
  await homeio.assertRecentData().catch(consola.error)

  const img = useImage()
  if (homeio.getData().fog) {
    img.draw(drawFog())
    return img
  }

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
    drawDock(weather, holidays, homeio, localTemperature),
    0, Const.ScreenHeight - dockHeight,
    Const.ScreenWidth, dockHeight
  )

  return img
}


// Caching
const lastImage: Map<string, Buffer> = new Map()
const lastUpdate: Map<string, number> = new Map()

function packageOp(opcode: number, payload?: Buffer) {
  const header = 0b11101 << 3
  const instruction = opcode & 0b111 // only last 3 bits
  const instructionBuffer = Buffer.from([ header | instruction ])
  const sleeptimeBuffer = Buffer.from([ getSleepMinutes() ])
  consola.info(`Packaging operation ${opcode} with payload size ${payload?.length ?? 0} bytes`)
  return payload
    ? Buffer.concat([ instructionBuffer, sleeptimeBuffer, payload ])
    : Buffer.concat([ instructionBuffer, sleeptimeBuffer ])
}

export async function buildCachedPackage(clientId: string, localTemperature?: string) {
  const img = await drawScreen(localTemperature)
  const imgBuffer = await img.renderFullBw()

  const needsFull = !lastUpdate.has(clientId) || lastUpdate.get(clientId) !== DatetimeUtils.getCurrentHour()
  lastUpdate.set(clientId, DatetimeUtils.getCurrentHour())

  if (needsFull || !lastImage.has(clientId)) {
    lastImage.set(clientId, imgBuffer)
    return packageOp(Const.OpFull, imgBuffer)
  }

  if (ImgDiff.areIdentical(lastImage.get(clientId)!, imgBuffer)) {
    return packageOp(Const.OpNoop)
  }

  const diff = ImgDiff.xor(lastImage.get(clientId)!, imgBuffer)
  const bounds = ImgDiff.getBounds(diff, Const.ScreenWidth, Const.ScreenHeight)
  ImgDiff.rasterBounds(bounds)
  if (bounds.w * bounds.h > Const.MaxPixelsForPartialUpdate) {
    lastImage.set(clientId, imgBuffer)
    return packageOp(Const.OpFull, imgBuffer)
  }

  const lastBuffer = lastImage.get(clientId)!
  const diffBuffer = Buffer.alloc(10 + lastBuffer.byteLength + Math.ceil(bounds.w * bounds.h / 8))
  diffBuffer.writeUInt16BE(bounds.x, 0)
  diffBuffer.writeUInt16BE(bounds.y, 2)
  diffBuffer.writeUInt16BE(bounds.w, 4)
  diffBuffer.writeUInt16BE(bounds.h, 6)
  diffBuffer.writeUInt16BE(lastBuffer.byteLength, 8)
  diffBuffer.fill(lastBuffer, 10, 10 + lastBuffer.byteLength)
  ImgDiff.copyBounds(imgBuffer, diffBuffer, 10 + lastBuffer.byteLength, bounds, Const.ScreenWidth)

  lastImage.set(clientId, imgBuffer)
  return packageOp(Const.OpPart, diffBuffer)
}


const whToken = '82Fwt5m8FVeJoVQOTbdS-heUlEo61s9KKPEH-z4GLRutXvvIlYAQqrQcMfGdo2cb0Yo5'
const whId = '1402180487795183698'

// Serversss!!!
const app = express()
app.get('/r', async (req, res) => {
  const log = `Request from ${req.ip} with ${Object.entries(req.query).map(([k, v]) => `${k}=${v}`).join(', ')} - ${getSleepMinutes()}min sleep`
  consola.info(log)
  const clientId = req.query.client ? String(req.query.client) : 'default'
  const localTemperature = req.query.temp ? String(req.query.temp) : undefined

  axios.post(`https://discord.com/api/webhooks/${whId}/${whToken}`, { content: log, username: `${os.hostname()} + (${clientId})` })

  const start = Date.now()
  const payload = await buildCachedPackage(clientId, localTemperature)
  const resTime = Date.now() - start
  consola.info(`Completed in ${resTime}ms`)
  res.send(payload)

  const log2 = `➥ Completed in ${resTime}ms with opcode ${payload[0] & 0b111}`
  axios.post(`https://discord.com/api/webhooks/${whId}/${whToken}`, { content: log2, username: `${os.hostname()} + (${clientId})` })
})
app.get('/', async (req, res) => {
  const log = `View from ${req.ip} with ${Object.entries(req.query).map(([k, v]) => `${k}=${v}`).join(', ')} - ${getSleepMinutes()}min sleep`
  consola.info(log)
  axios.post(`https://discord.com/api/webhooks/${whId}/${whToken}`, { content: log, username: os.hostname() })

  const localTemperature = req.query.temp ? String(req.query.temp) : undefined
  const start = Date.now()
  const img = await drawScreen(localTemperature)
  const imgBuffer = await img.exportFullBw()
  consola.info(`Completed in ${Date.now() - start}ms`)

  res.setHeader('Content-Type', 'image/png')
  res.send(imgBuffer)
})
app.get('/discord-manual', () => disco.badaboom())
app.get('/gcalendar-callback', (req, res) => {
  const code = req.query.code
  console.log('GCalendar OAuth callback received with code:', code)
  
  res.send('<!DOCTYPE html><html><body><script>window.close();</script></body></html>')
})

const CRT_PATH = path.join(import.meta.dirname, '..', 'credentials', 'raspi.salmon-court.ts.net.crt')
const KEY_PATH = path.join(import.meta.dirname, '..', 'credentials', 'raspi.salmon-court.ts.net.key')
if (await fs.exists(CRT_PATH)) {
  const httpServer = http.createServer(app)
  const httpsServer = https.createServer({ key: await fs.readFile(KEY_PATH), cert: await fs.readFile(CRT_PATH) }, app)
  httpServer.listen(3034, '0.0.0.0', () => consola.log('Server is running on http://localhost:3034'))
  httpsServer.listen(3035, '0.0.0.0', () => consola.log('Server is running on https://localhost:3035'))
} else {
  app.listen(3034, '0.0.0.0', () => consola.log('Server is running on http://localhost:3034'))
}
