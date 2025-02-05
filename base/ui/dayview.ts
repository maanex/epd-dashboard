import type { WeatherApi } from "../api/weather"
import type { Renderer } from "../lib/image"


const height = 100

const firstHour = 6
const lastHour = 26

export function drawDayview(weather: WeatherApi): Renderer {
  return ({ paint, width }) => {
    const hourCount = (lastHour - firstHour)

    const today = weather.getToday()
    const hourly = weather.getHourly().slice(firstHour, lastHour)

    const temperatureMax = Math.max(...hourly.map(h => h.temperature))
    const temperatureMin = Math.min(...hourly.map(h => h.temperature))
    const temperatureDelta = temperatureMax - temperatureMin

    const hourWidth = width / hourCount

    const sunriseRelative = today.sunrise.getHours() - firstHour
    const sunsetRelative = today.sunset.getHours() - firstHour

    for (let hour = 0; hour < hourCount; hour++) {
      const hourWeather = hourly[hour]

      if (hour < sunriseRelative || hour > sunsetRelative) {
        paint.newRect()
          .from(hourWidth * hour, 0)
          .sized(hourWidth, height)
          .fill('lighter')
      } else if (hour === sunriseRelative) {
        const part = Math.round((today.sunrise.getMinutes() / 60) * hourWidth)
        paint.newRect()
          .from(hourWidth * hour, 0)
          .sized(part, height)
          .fill('lighter')
        paint.newRect()
          .from(hourWidth * hour + part, 0)
          .sized(hourWidth - part, height)
          .fill('white')
      } else if (hour < sunsetRelative) {
        paint.newRect()
          .from(hourWidth * hour, 0)
          .sized(hourWidth, height)
          .fill('white')
      } else if (hour === sunsetRelative) {
        const part = Math.round((today.sunset.getMinutes() / 60) * hourWidth)
        paint.newRect()
          .from(hourWidth * hour, 0)
          .sized(part, height)
          .fill('white')
        paint.newRect()
          .from(hourWidth * hour + part, 0)
          .sized(hourWidth - part, height)
          .fill('lighter')
      }

      paint.newRect()
        .from(hourWidth * hour, height - (hourWeather.temperature - temperatureMin) / temperatureDelta * height)
        .sized(hourWidth, 2)
        .fill('medium')

      if (hour !== 0) {
        paint
          .newRect(hourWidth * hour, 0, (hour + firstHour) % 6 === 0 ? 2 : 1, height)
          .fill('black')
      }
    }

    paint.newRect(0, height-1, width, 1)
      .fill('black')
  }
}
