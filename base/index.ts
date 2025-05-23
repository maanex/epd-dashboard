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
import { useGCalendarApi } from "./api/gcalendar"
import { drawCalendarAgenda } from "./ui/calendar"
import consola from "consola"
import { useHolidaysApi } from "./api/holidays"
import { runDiscordBot } from "./discord/bot"


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
const calendar = await useGCalendarApi({
  blacklist: [ /@group\.v\.calendar\.google\.com$/gi ]
})
consola.success('gCalendar loaded')

consola.start('Loading holidays')
const holidays = await useHolidaysApi()
consola.success('Holidays loaded')


async function drawScreen() {
  await weather.assertRecentData()
  await calendar.assertRecentData()
  await holidays.assertRecentData()

  const img = useImage()

  const dayviewHeight = 100
  const dockHeight = 60
  const horizontalSplit = 250

  await img.draw(
    drawDayview(weather),
    0, 0,
    Const.ScreenWidth, dayviewHeight
  )
  img.draw(
    drawCalendarAgenda(calendar),
    0, dayviewHeight,
    horizontalSplit, Const.ScreenHeight - dayviewHeight - dockHeight
  )
  await img.draw(
    drawQuote({
      author: 'maanex',
      text: 'lorem ipsum dolor sittim (which is the opposite of standim)',
      // image: 'https://media.discordapp.net/attachments/709144084933247096/1357021815268053313/image.png?ex=67fdd9cd&is=67fc884d&hm=58332d14c895eb922c8573e69b774611447e287037c2e746e9e778e2babb0bc5&=&format=webp&quality=lossless&width=1474&height=1428'
      image: 'https://media.tenor.com/K2bnpusQYIMAAAAM/silly-cat.gif'
    }),
    horizontalSplit, dayviewHeight,
    Const.ScreenWidth - horizontalSplit, Const.ScreenHeight - dayviewHeight - dockHeight
  )
  await img.draw(
    drawDock(weather, holidays),
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

  lastChange = Date.now()
  const img = await drawScreen()
  const rendered = img.renderFullBw()
  consola.info(`Frame rendered in ${Date.now() - lastChange}ms`)
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

const server = runDiscordBot()
