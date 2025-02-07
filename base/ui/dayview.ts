import type { WeatherApi } from "../api/weather"
import { Easings } from "../lib/easings"
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
    }

    const tempUpper = ~~(height * 0.1)
    const tempLower = ~~(height - height * 0.2)
    const tempVar = tempLower - tempUpper
    for (let hour = 0; hour < hourCount; hour++) {
      const leftValue = hourly[hour === 0 ? 0 : (hour - 1)].temperature
      const centerValue = hourly[hour].temperature
      const rightValue = hourly[hour === (hourCount - 1) ? (hourCount - 1) : (hour + 1)].temperature
      const hourWidthHalf = hourWidth/2

      let x = 0, y = 0, p = 0, g = 0, w = 0
      for (let xi = 0; xi < hourWidthHalf; xi++) {
        x = xi + hourWidth * hour
        p = xi / hourWidthHalf
        g = (leftValue + centerValue) / 2
        w = g + Easings.easeOutQuad(p) * (centerValue - g)
        y = tempLower - tempVar * (w - temperatureMin) / temperatureDelta
        paint.setPixel(x, y-2, 1)
        paint.setPixel(x, y-1, 1)
        paint.setPixel(x, y, 0)
        paint.setPixel(x, y+1, 0)
        paint.setPixel(x, y+2, 1)
        paint.setPixel(x, y+3, 1)
      }
      for (let xi = hourWidthHalf; xi < hourWidth; xi++) {
        x = xi + hourWidth * hour
        p = (xi - hourWidthHalf) / hourWidthHalf
        g = (centerValue + rightValue) / 2
        w = centerValue + Easings.easeInQuad(p) * (g - centerValue)
        y = tempLower - tempVar * (w - temperatureMin) / temperatureDelta
        paint.setPixel(x, y-2, 1)
        paint.setPixel(x, y-1, 1)
        paint.setPixel(x, y, 0)
        paint.setPixel(x, y+1, 0)
        paint.setPixel(x, y+2, 1)
        paint.setPixel(x, y+3, 1)
      }

      if (hour !== 0) {
        paint.newRect()
          .from(hourWidth * hour, 0)
          .sized((hour + firstHour) % 6 === 0 ? 2 : 1, height)
          .fill((hour + firstHour) % 6 === 0 ? 'black' : 'medium', 'darken')
      }
    }

    const currentHour = new Date().getHours()
    const currentX = hourWidth * (currentHour - firstHour) + hourWidth / 2
    if (currentX >= 0 && currentX < width) {
      const size = 12
      const y = tempLower - tempVar * (hourly[currentHour - firstHour].temperature - temperatureMin) / temperatureDelta - size/2 + 1
      paint.newRect()
        .from(currentX - size/2, y)
        .sized(size, size)
        .round(-4)
        .inset(-2)
        .fill('white')
        .inset(2)
        .fill('black')
    }

    const warmestHour = hourly.reduce((a, b) => a.temperature > b.temperature ? a : b)
    const warmestHourIdx = ((warmestHour.hour < firstHour) ? (warmestHour.hour + 24) : warmestHour.hour) - firstHour
    const coldestHour = hourly.reduce((a, b) => a.temperature < b.temperature ? a : b)
    const coldestHourIdx = ((coldestHour.hour < firstHour) ? (coldestHour.hour + 24) : coldestHour.hour) - firstHour
    paint
      .newText(warmestHour.temperature.toFixed(1) + '°')
      .at(warmestHourIdx * hourWidth + hourWidth / 2, tempUpper + 10)
      .anchor('center', 'top')
      .size(12)
      .threshold(0.8)
      .render('black')
    paint
      .newText(coldestHour.temperature.toFixed(1) + '°')
      .at(coldestHourIdx * hourWidth + hourWidth / 2, tempLower - 10)
      .anchor('center', 'bottom')
      .size(12)
      .threshold(0.8)
      .render('black')


    paint.newRect(0, 0, width, height)
      .outline('black', 2)
    // paint.newRect(0, height-1, width, 1)
    //   .fill('black')
  }
}
