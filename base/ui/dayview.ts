import type { WeatherApi } from "../api/weather"
import { Easings } from "../lib/easings"
import type { Renderer } from "../lib/image"
import type { FillStyle } from "../lib/paint"


const firstHour = 6
const lastHour = 26

function getDarkness(value: number): FillStyle {
  if (value < 15) return 'white'
  if (value < 30) return 'lightest'
  if (value < 50) return 'lighter'
  if (value < 75) return 'light'
  if (value < 85) return 'medium'
  if (value < 93) return 'dark'
  return 'black'
}

function blendValues(numA: number, numB: number, weight: number): number {
  if (numA === undefined)
    return numB
  if (numB === undefined)
    return numA
  return numA * (1 - weight) + numB * weight
}

export function drawDayview(weather: WeatherApi): Renderer {
  return ({ paint, width, height }) => {
    const hourCount = (lastHour - firstHour)

    const today = weather.getToday()
    const hourly = weather.getHourly().slice(firstHour, lastHour)

    const temperatureMax = Math.max(...hourly.map(h => h.temperature))
    const temperatureMin = Math.min(...hourly.map(h => h.temperature))
    const temperatureDelta = temperatureMax - temperatureMin

    const hourWidth = width / hourCount
    const cloudCoverHeight = ~~(height * 0.18)

    const sunriseRelative = today.sunrise.getHours() - firstHour
    const sunsetRelative = today.sunset.getHours() - firstHour

    for (let hour = 0; hour < hourCount; hour++) {
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

      // cloud coverage
      for (let part = 0; part < 5; part++) {
        const x = hourWidth * hour + (part * hourWidth / 5)
        const value = (part === 2) ? hourly[hour].cloudCover
          : (part === 0) ? blendValues(hourly[hour-1]?.cloudCover, hourly[hour].cloudCover, 1/3)
          : (part === 1) ? blendValues(hourly[hour-1]?.cloudCover, hourly[hour].cloudCover, 2/3)
          : (part === 3) ? blendValues(hourly[hour].cloudCover, hourly[hour+1]?.cloudCover, 1/3)
          : (part === 4) ? blendValues(hourly[hour].cloudCover, hourly[hour+1]?.cloudCover, 2/3)
          : 0

        for (let yi = 0; yi < cloudCoverHeight; yi += 1) {
          const falloff = Math.sqrt((cloudCoverHeight - yi) / cloudCoverHeight)
          paint.newRect()
            .from(x, yi)
            .sized(hourWidth / 5, 1)
            .fill(getDarkness(value * falloff), 'darken')
        }
      }
    }

    const tempUpper = ~~(height * 0.1)
    const tempLower = ~~(height - height * 0.2)
    const rainHeight = ~~(height * 0.8)
    const tempVar = tempLower - tempUpper
    const hourWidthHalf = hourWidth/2

    let x = 0, y = 0, p = 0, g = 0, w = 0
    let leftValue = 0, centerValue = 0, rightValue = 0
    for (let hour = 0; hour < hourCount; hour++) {
      if (hour !== 0) {
        paint.newRect()
          .from(hourWidth * hour, 0)
          .sized((hour + firstHour) % 6 === 0 ? 2 : 1, height)
          .fill((hour + firstHour) % 6 === 0 ? 'black' : 'medium', 'darken')
      }

      // Rain
      leftValue = hourly[hour === 0 ? 0 : (hour - 1)].precipitationProbability
      centerValue = hourly[hour].precipitationProbability
      rightValue = hourly[hour === (hourCount - 1) ? (hourCount - 1) : (hour + 1)].precipitationProbability
      for (let xi = 0; xi < hourWidthHalf; xi++) {
        x = xi + hourWidth * hour
        p = xi / hourWidthHalf
        g = (leftValue + centerValue) / 2
        w = g + Easings.easeOutQuad(p) * (centerValue - g)
        y = height - rainHeight * w / 100
        for (let yi = y; yi < height; yi++)
          paint.setPixel(x, yi, 0)
      }
      for (let xi = hourWidthHalf; xi < hourWidth; xi++) {
        x = xi + hourWidth * hour
        p = (xi - hourWidthHalf) / hourWidthHalf
        g = (centerValue + rightValue) / 2
        w = centerValue + Easings.easeInQuad(p) * (g - centerValue)
        y = height - rainHeight * w / 100
        for (let yi = y; yi < height; yi++)
          paint.setPixel(x, yi, 0)
      }

      // Temperature
      leftValue = hourly[hour === 0 ? 0 : (hour - 1)].temperature
      centerValue = hourly[hour].temperature
      rightValue = hourly[hour === (hourCount - 1) ? (hourCount - 1) : (hour + 1)].temperature
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
    }

    const currentHour = new Date().getHours()
    const currentX = hourWidth * (currentHour - firstHour) + hourWidth / 2
    if (currentX >= 0 && currentX < width) {
      const size = 14
      const y = tempLower - tempVar * (hourly[currentHour - firstHour].temperature - temperatureMin) / temperatureDelta - size/2 + 1
      paint.newRect()
        .from(currentX - size/2, y)
        .sized(size, size)
        .round(-3)
        .inset(-2)
        .fill('white')
        .inset(2)
        .fill('black')
        .inset(2)
        .fill('dark')
    }

    const warmestHour = hourly.reduce((a, b) => a.temperature > b.temperature ? a : b)
    const warmestHourIdx = ((warmestHour.hour < firstHour) ? (warmestHour.hour + 24) : warmestHour.hour) - firstHour
    const coldestHour = hourly.reduce((a, b) => a.temperature < b.temperature ? a : b)
    const coldestHourIdx = ((coldestHour.hour < firstHour) ? (coldestHour.hour + 24) : coldestHour.hour) - firstHour
    paint
      .newText(Math.round(warmestHour.temperature) + '°')
      .at(warmestHourIdx * hourWidth + hourWidth / 2, tempUpper + 10)
      .anchor('center', 'top')
      .size(12)
      .threshold(0.9)
      .useRect(r => r
        .inset(-2)
        .round(4)
        .fill('white')
      )
      .render('black')
    paint
      .newText(Math.round(coldestHour.temperature) + '°')
      .at(coldestHourIdx * hourWidth + hourWidth / 2, tempLower - 10)
      .anchor('center', 'bottom')
      .size(12)
      .threshold(0.9)
      .useRect(r => r
        .inset(-2)
        .round(4)
        .fill('white')
      )
      .render('black')

    for (let h6block = Math.floor(firstHour / 6); h6block <= Math.floor(lastHour / 6); h6block++) {
      if (warmestHour.hour >= h6block * 6 && warmestHour.hour < (h6block + 1) * 6) continue
      if (coldestHour.hour >= h6block * 6 && coldestHour.hour < (h6block + 1) * 6) continue

      const hourId = h6block * 6 + new Date().getDay() % 4 + 1
      const hourIdx = ((hourId < firstHour) ? (hourId + 24) : hourId) - firstHour
      const hour = hourly[hourIdx]
      if (!hour) continue

      const yRel = (hour.temperature - temperatureMin) / temperatureDelta
      const y = tempLower - tempVar * yRel
      const yOff = yRel < 0.5 ? -15 : 15

      paint
        .newText(Math.round(hour.temperature) + '°')
        .at(hourIdx * hourWidth + hourWidth / 2, y + yOff)
        .anchor('center', 'center')
        .size(12)
        .threshold(0.65)
        .useRect(r => r
          .inset(-2)
          .round(4)
          .fill('white')
        )
        .render('black')
    }

    paint.newRect(0, height-2, width, 2)
      .fill('black')
  }
}
