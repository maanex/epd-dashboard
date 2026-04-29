import type { WeatherApi } from "../../api/weather"
import { icons } from "../../lib/icons"
import type { Renderer } from "../../lib/image"
import { orderedDither } from "../../lib/imgdither"
import type { FillStyle } from "../../lib/paint"


const firstHour = 6
const lastHour = 26

function blendValues(numA: number, numB: number, weight: number): number {
  if (numA === undefined)
    return numB
  if (numB === undefined)
    return numA
  return numA * (1 - weight) + numB * weight
}

function clampIndex(values: number[], index: number): number {
  if (index <= 0)
    return values[0]
  if (index >= values.length - 1)
    return values[values.length - 1]
  return values[index]
}

function sampleCatmullRom(values: number[], t: number): number {
  const i1 = Math.floor(t)
  const i2 = i1 + 1
  const p0 = clampIndex(values, i1 - 1)
  const p1 = clampIndex(values, i1)
  const p2 = clampIndex(values, i2)
  const p3 = clampIndex(values, i2 + 1)
  const u = t - i1
  const u2 = u * u
  const u3 = u2 * u

  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * u3
  )
}

export function drawDayview(weather: WeatherApi): Renderer<void> {
  return ({ paint, width, height }) => {
    const hourCount = (lastHour - firstHour)

    const today = weather.getToday()
    const hourly = weather.getHourly().slice(firstHour, lastHour)
    const hourWidth = width / hourCount

    const temperatureMax = Math.max(...hourly.map(h => h.temperature))
    const temperatureMin = Math.min(...hourly.map(h => h.temperature))
    const temperatureDelta = temperatureMax - temperatureMin
    const temperatureRange = Math.max(temperatureDelta, 0.0001)

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
    }

    // Clouds
    const grayscaleMap = new Uint8Array(width * cloudCoverHeight)
    const addCloud = (x: number, impact: number) => {
      const size = impact * hourWidth
      const left = Math.floor(x - size/2)
      const right = Math.ceil(x + size/2)
      const cloudY = cloudCoverHeight * Math.exp(-size/15) - (cloudCoverHeight * 0.2)
      const cloudHeight = Math.min(cloudCoverHeight - cloudY, size/3)
      for (let xi = left; xi < right; xi++) {
        if (xi < 0 || xi >= width)
          continue
        const relX = Math.abs((xi - x) / (size/2))
        for (let yi = 0; yi < cloudCoverHeight; yi++) {
          const relY = Math.abs((yi - cloudY) / cloudHeight)
          const dist = Math.sqrt(relX**2 + relY**2)
          if (dist < 1) {
            const value = Math.round(Math.max(0, 1 - dist) * impact**2 * 180)
            grayscaleMap[yi * width + xi] = Math.min(grayscaleMap[yi * width + xi] + value, 255)
          }
        }
      }
    }

    for (let hour = 0; hour < hourCount; hour++) {
      const cloudDensity = hourly[hour].cloudCover / 100
      if (cloudDensity > 0) {
        const cloudCount = Math.round((cloudDensity ** 2) * 8)
        for (let i = 0; i < cloudCount; i++) {
          const x = hourWidth * hour + (Math.sin(i * 17.1 + hour*1.41 + cloudDensity*2)/2 + 0.5) * hourWidth * 0.9 + hourWidth * 0.05
          addCloud(x, cloudDensity / (Math.max(1, i/1.7)))
        }
      }
    }
    orderedDither(grayscaleMap, width, cloudCoverHeight)
    for (let yi = 0; yi < cloudCoverHeight; yi++) {
      for (let xi = 0; xi < width; xi++) {
        if (grayscaleMap[yi * width + xi] > 0)
          paint.setPixel(xi, yi, 0)
      }
    }

    const tempUpper = ~~(height * 0.1)
    const tempLower = ~~(height * 0.8)
    const rainHeight = ~~(height * 0.8)
    const tempVar = tempLower - tempUpper

    // Hour dividers
    for (let hour = 0; hour < hourCount; hour++) {
      if (hour !== 0) {
        paint.newRect()
          .from(hourWidth * hour, 0)
          .sized((hour + firstHour) % 6 === 0 ? 2 : 1, height)
          .fill((hour + firstHour) % 6 === 0 ? 'black' : 'medium', 'darken')
      }
    }

    // Horizontal temperature lines
    for (const thresh of [ -10, 0, 10, 20, 30 ]) {
      const y = tempLower - tempVar * (thresh - temperatureMin) / temperatureRange
      if (y < tempUpper/2 || y > height)
        continue

      paint.newRect()
        .from(0, y)
        .sized(width, 1)
        .fill('medium', 'darken')
    }

    const toHourT = (x: number) => (x / Math.max(1, width - 1)) * (hourCount - 1)
    const rainValues = hourly.map(h => h.precipitationProbability)
    const tempValues = hourly.map(h => h.temperature)
    const rainTopYs: number[] = []
    const tempYs: number[] = []

    // Precalculating rain and temperature positions
    for (let xi = 0; xi < width; xi++) {
      const t = toHourT(xi)
      const rainValue = Math.max(0, Math.min(100, sampleCatmullRom(rainValues, t)))
      const tempValue = sampleCatmullRom(tempValues, t)

      rainTopYs.push(height - rainHeight * rainValue / 100)
      tempYs.push(tempLower - tempVar * (tempValue - temperatureMin) / temperatureRange)
    }

    // Filling rain
    for (let xi = 0; xi < width; xi++) {
      const rainTop = Math.max(0, Math.min(height - 1, Math.round(rainTopYs[xi])))
      for (let yi = rainTop; yi < height; yi++)
        paint.setPixel(xi, yi, 0)
      if (rainTop !== height - 1)
        paint.setPixel(xi, rainTop, 1)
    }

    // Two passes for temperature (white outline and black inner)
    const drawStrokeSegment = (x0: number, y0: number, x1: number, y1: number, radius: number, fill: FillStyle) => {
      const dx = x1 - x0
      const dy = y1 - y0
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2))

      for (let i = 0; i <= steps; i++) {
        const p = i / steps
        const x = x0 + dx * p
        const y = y0 + dy * p
        paint.newDisc().at(x, y).radius(radius).fill(fill)
      }
    }
    for (let xi = 1; xi < width; xi++) {
      drawStrokeSegment(xi - 1, tempYs[xi - 1], xi, tempYs[xi], 3, 'white')
    }
    for (let xi = 1; xi < width; xi++) {
      drawStrokeSegment(xi - 1, tempYs[xi - 1], xi, tempYs[xi], 1, 'black')
    }

    // Thunder icons
    for (let hour = 0; hour < hourCount; hour++) {
      if (hourly[hour].weatherCode >= 90 && hourly[hour].weatherCode < 100) {
        paint.newIcon(icons.lightning)
          .at(hourWidth * hour + hourWidth / 2, height * 0.8)
          .anchor('center', 'center')
          .fill('black', 'invert')
      }
    }

    let currentHour = new Date().getHours()
    if (currentHour < firstHour)
      currentHour += 24

    const halfHourOffset = (new Date().getMinutes() < 15) ? 0
      : (new Date().getMinutes() <= 45) ? 0.5
      : 1

    const currentX = hourWidth * (currentHour - firstHour) + halfHourOffset * hourWidth
    if (currentX >= 0 && currentX < width) {
      const size = 14
      const y = tempYs[currentX] - size/2 + 1
      paint.newRect()
        .from(currentX - size/2, y)
        .sized(size, size)
        .round(-3)
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
      .newText(Math.round(warmestHour.temperature) + '°')
      .at(warmestHourIdx * hourWidth + hourWidth / 2, tempUpper + 10)
      .anchor('center', 'top')
      .size(12)
      .threshold(1)
      .useRect(r => r
        .inset(-2)
        .round(4)
        .fill((height - warmestHour.precipitationProbability / 100 * rainHeight) > (r.getSize().y + r.getSize().height/2) ? 'white' : 'black')
      )
      .render('black', 'invert')
    paint
      .newText(Math.round(coldestHour.temperature) + '°')
      .at(coldestHourIdx * hourWidth + hourWidth / 2, tempLower - 10)
      .anchor('center', 'bottom')
      .size(12)
      .threshold(1)
      .useRect(r => r
        .inset(-2)
        .round(4)
        .fill((height - coldestHour.precipitationProbability / 100 * rainHeight) > (r.getSize().y + r.getSize().height/2) ? 'white' : 'black')
      )
      .render('black', 'invert')

    for (let h6block = Math.floor(firstHour / 6); h6block <= Math.floor(lastHour / 6); h6block++) {
      if (warmestHour.hour >= h6block * 6 && warmestHour.hour < (h6block + 1) * 6) continue
      if (coldestHour.hour >= h6block * 6 && coldestHour.hour < (h6block + 1) * 6) continue

      const hourId = h6block * 6 + new Date().getDay() % 4 + 1
      const hourIdx = ((hourId < firstHour) ? (hourId + 24) : hourId) - firstHour
      const hour = hourly[hourIdx]
      if (!hour) continue

      const yRel = (hour.temperature - temperatureMin) / temperatureRange
      const y = tempLower - tempVar * yRel
      const yOff = yRel < 0.5 ? -15 : 15

      paint
        .newText(Math.round(hour.temperature) + '°')
        .at(hourIdx * hourWidth + hourWidth / 2, y + yOff)
        .anchor('center', 'center')
        .size(12)
        .threshold(0.70)
        .useRect(r => r
          .inset(-2)
          .round(4)
          .fill((height - hour.precipitationProbability / 100 * rainHeight) > (r.getSize().y + r.getSize().height/2) ? 'white' : 'black')
        )
        .render('black', 'invert')
    }
  }
}
