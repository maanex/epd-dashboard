import { useWeatherApi } from "./api/weather"
import { RawCtx, useImage } from "./lib/image"
import { TopicUpFull, TopicUpPart, useMqtt } from "./lib/mqtt"
import { drawBar } from "./ui/bar"
import { drawDayview } from "./ui/dayview"
import { GlobalFonts } from '@napi-rs/canvas'
import * as path from 'path'
import { drawClock } from "./ui/clock"

GlobalFonts.registerFromPath(path.join(import.meta.dirname, '..', 'assets', 'Modak-Regular.ttf'), 'Modak')

const mqtt = useMqtt()
await mqtt.init()

mqtt.subscribeStat(message => {
  console.log(message)
})

const weather = await useWeatherApi()

const img = useImage()

const dayviewHeight = 100
const barHeight = 30

img.draw(
  drawDayview(weather),
  0,
  0,
  img.width,
  dayviewHeight
)

img.draw(
  drawClock(),
  0,
  dayviewHeight,
  img.width,
  img.height - dayviewHeight - barHeight
)

img.draw(
  drawBar(weather),
  0,
  img.height - barHeight,
  img.width,
  barHeight
)


// Export image locally
await img.exportFullBw('test.png')

// // Render image on epd
// const rendered = img.renderFullBw()
// mqtt.sendBinary(TopicUpFull, rendered)

// // Clear epd screen
// mqtt.sendBinary(TopicUpFull, new Buffer(0))

