import { DatetimeUtils } from "../lib/datetime-utils"
import type { WeatherData } from "./weather-types"


type Hourly = {
  hour: number
  temperature: number
  humidity: number
  precipitationProbability: number
  precipitation: number
  weatherCode: number
  cloudCover: number
}

const url = 'https://api.open-meteo.com/v1/forecast?latitude=49.579&longitude=11.018&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,sunshine_duration,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours&timezone=Europe%2FBerlin&past_days=1'

export const useWeatherApi = async () => {
  const fetchWeather = async () => {
    const response = await fetch(url)
    const data = await response.json()
    return data as WeatherData
  }

  let data = await fetchWeather()
  let lastUpdateHour = DatetimeUtils.getCurrentHour()

  async function refresh() {
    data = await fetchWeather()
    lastUpdateHour = DatetimeUtils.getCurrentHour()
  }

  async function assertRecentData() {
    if (lastUpdateHour !== DatetimeUtils.getCurrentHour())
      await refresh()
  }

  //

  function getDay(relative: number) {
    return {
      weatherCode: data.daily.weather_code[relative],
      temperatureMax: data.daily.temperature_2m_max[relative],
      temperatureMin: data.daily.temperature_2m_min[relative],
      sunrise: new Date(data.daily.sunrise[relative]),
      sunset: new Date(data.daily.sunset[relative]),
      daylightDuration: data.daily.daylight_duration[relative],
      sunshineDuration: data.daily.sunshine_duration[relative],
      precipitationSum: data.daily.precipitation_sum[relative],
      rainSum: data.daily.rain_sum[relative],
      showersSum: data.daily.showers_sum[relative],
      snowfallSum: data.daily.snowfall_sum[relative],
      precipitationHours: data.daily.precipitation_hours[relative]
    }
  }

  function getToday() {
    return getDay(0)
  }

  function daysUntil(date: Date) {
    const now = new Date(Date.now() - 2 * 60 * 60 * 1000) // only count as new day if it's past 2am
    now.setHours(12, 0, 0, 0)
    const copy = new Date(date)
    copy.setHours(12, 0, 0, 0)
    return Math.ceil((copy.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  function getHourly() {
    const out: Hourly[] = []

    for (let i = 0; i < data.hourly.time.length; i++) {
      const date = new Date(data.hourly.time[i])
      const dateDelta = daysUntil(date)
      const index = dateDelta * 24 + date.getHours()
      console.log(index)

      out[index] = {
        hour: date.getHours(),
        temperature: data.hourly.temperature_2m[i],
        humidity: data.hourly.relative_humidity_2m[i],
        precipitationProbability: data.hourly.precipitation_probability[i],
        precipitation: data.hourly.precipitation[i],
        weatherCode: data.hourly.weather_code[i],
        cloudCover: data.hourly.cloud_cover[i]
      }
    }

    return out
  }

  return {
    refresh,
    assertRecentData,
    getDay,
    getToday,
    getHourly,
  }
}

export type WeatherApi = Awaited<ReturnType<typeof useWeatherApi>>
