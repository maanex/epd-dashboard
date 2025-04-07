import { useWeatherApi } from "./api/weather"
import { useImage } from "./lib/image"
import { TopicUpFull, TopicUpPart, useMqtt, useMqttStub } from "./lib/mqtt"
import { drawDayview } from "./ui/dayview"
import { GlobalFonts } from '@napi-rs/canvas'
import * as path from 'path'
import { Const } from "./lib/const"
import { ImgDiff } from "./lib/imgdiff"
import { ImgDebug } from "./lib/imgdebug"
import { drawQuote } from "./ui/quote"
import { drawDock } from "./ui/dock"
import { useGCalendarApi, type GCalendarApi } from "./api/gcalendar"
import { drawCalendarUpcoming } from "./ui/calendar"
import consola from "consola"
import * as fs from 'fs/promises'

GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Modak-Regular.ttf'), 'Modak')
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Yarndings12-Regular.ttf'), 'Yarndings12')
GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Yarndings20-Regular.ttf'), 'Yarndings20')

// /*
const mqtt = useMqttStub()
//*/ const mqtt = useMqtt()
//*/
await mqtt.init()

mqtt.subscribeStat(message => {
  consola.withTag('MQTT').info(message)
})

consola.start('Loading weather')
const weather = await useWeatherApi()
consola.success('Weather loaded')

consola.start('Loading gCalendar')
// const calendar = await useGCalendarApi({
//   blacklist: [ /@group\.v\.calendar\.google\.com$/gi ]
// })
// await fs.writeFile(path.join(import.meta.dir, '..', 'temp/calendar.json'), JSON.stringify(calendar, null, 2))
const calendar = JSON.parse(await fs.readFile(path.join(import.meta.dir, '..', 'temp/calendar.json'), 'utf-8')) as GCalendarApi
consola.success('gCalendar loaded')


function drawScreen() {
  const img = useImage()

  const dayviewHeight = 100
  const dockHeight = 60

  img.draw(
    drawDayview(weather),
    0, 0,
    Const.ScreenWidth, dayviewHeight
  )
  img.draw(
    drawCalendarUpcoming(calendar),
    0, dayviewHeight,
    Const.ScreenWidth, Const.ScreenHeight - dayviewHeight - dockHeight
  )
  img.draw(
    drawDock(weather),
    0, Const.ScreenHeight - dockHeight,
    Const.ScreenWidth, dockHeight
  )

  return img
}

let lastRendered: Buffer | null = null
let lastChange = 0
async function drawAndUpdate(forceFullUpdate: boolean) {
  if (Date.now() - lastChange < 5000)
    return

  const img = drawScreen()
  const rendered = img.renderFullBw()
  await img.exportFullBw('test.png')

  if (!lastRendered || forceFullUpdate) {
    mqtt.sendBinary(TopicUpFull, rendered)
    lastRendered = rendered
    return
  }

  console.log('Partial update maybe')
  if (ImgDiff.areIdentical(lastRendered, rendered))
    return

  const diff = ImgDiff.xor(lastRendered, rendered)
  await ImgDebug.renderBits(diff, Const.ScreenWidth, Const.ScreenHeight)
  const bounds = ImgDiff.getBounds(diff, Const.ScreenWidth, Const.ScreenHeight)
  console.log('Partial update', bounds, bounds.w * bounds.h, Const.MaxPixelsForPartialUpdate)
  if (bounds.w * bounds.h > Const.MaxPixelsForPartialUpdate) {
    mqtt.sendBinary(TopicUpFull, rendered)
    lastRendered = rendered
    return
  }

  const buff = Buffer.alloc(8 + Math.ceil(bounds.w * bounds.h / 8))
  buff.writeUInt16BE(bounds.x, 0)
  buff.writeUInt16BE(bounds.y, 2)
  buff.writeUInt16BE(bounds.w, 4)
  buff.writeUInt16BE(bounds.h, 6)
  ImgDiff.copyBounds(diff, buff, 8, bounds, Const.ScreenWidth)
  mqtt.sendBinary(TopicUpPart, buff)
}

async function run() {
  consola.log('First')
  await drawAndUpdate(false)
  // await new Promise(resolve => setTimeout(resolve, 7000))
  // console.log('Second')
  // await drawAndUpdate(false)
}
run()

// // Clear epd screen
// mqtt.sendBinary(TopicUpFull, new Buffer(0))

