import { useWeatherApi } from "./api/weather"
import { RawCtx, useImage } from "./lib/image"
import { TopicUpFull, TopicUpPart, useMqtt } from "./lib/mqtt"
import { drawDayview } from "./ui/dayview"

const mqtt = useMqtt()
await mqtt.init()

mqtt.subscribeStat(message => {
  console.log(message)
})

const weather = await useWeatherApi()

const img = useImage()
img.draw(drawDayview(weather))
img.draw(({ ctx, height }) => {
  ctx.fillStyle = 'black'
  ctx.font = '30px Arial'
  ctx.fillText('hello', 10, height - 40)
})

// const rendered = img.renderFullBw()
await img.exportFullBw('test.png')

// mqtt.sendBinary(TopicUpFull, rendered)
// mqtt.sendBinary(TopicUpFull, Buffer.from('hello'))
