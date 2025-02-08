import { useWeatherApi } from "./api/weather"
import { RawCtx, useImage } from "./lib/image"
import { TopicUpFull, TopicUpPart, useMqtt } from "./lib/mqtt"
import { drawBar } from "./ui/bar"
import { drawDayview } from "./ui/dayview"

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
img.draw(drawBar(barHeight))

const takenHeight = dayviewHeight + barHeight
img.draw(({ paint, height }) => {
  const rn = new Date()
  const text = `${rn.getHours().toString().padStart(2, '0')}:${rn.getMinutes().toString().padStart(2, '0')}`
  paint
    .newText(text)
    .at(img.width / 2, (img.height - takenHeight) / 2 + dayviewHeight)
    .anchor('center', 'center')
    .size(200)
    .font('Nimbus Roman')
    .render('dark')
})

// const rendered = img.renderFullBw()
await img.exportFullBw('test.png')

// mqtt.sendBinary(TopicUpFull, rendered)
// mqtt.sendBinary(TopicUpFull, Buffer.from('hello'))
