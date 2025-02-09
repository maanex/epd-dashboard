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
img.draw(drawDayview(weather, dayviewHeight))

const barHeight = 30
img.draw(drawBar(weather, barHeight))

const takenHeight = dayviewHeight + barHeight
img.draw(drawClock(img.height - takenHeight, dayviewHeight))


// Export image locally
await img.exportFullBw('test.png')

// // Render image on epd
// const rendered = img.renderFullBw()
// mqtt.sendBinary(TopicUpFull, rendered)

// // Clear epd screen
// mqtt.sendBinary(TopicUpFull, new Buffer(0))

