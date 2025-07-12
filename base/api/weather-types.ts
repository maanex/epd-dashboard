
export type WeatherData = {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  hourly_units: {
    time: string
    temperature_2m: string
    relative_humidity_2m: string
    precipitation_probability: string
    precipitation: string
    weather_code: string
    cloud_cover: string
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    relative_humidity_2m: number[]
    precipitation_probability: number[]
    precipitation: number[]
    weather_code: number[]
    cloud_cover: number[]
  }
  daily_units: {
    time: string
    weather_code: string
    temperature_2m_max: string
    temperature_2m_min: string
    sunrise: string
    sunset: string
    daylight_duration: string
    sunshine_duration: string
    precipitation_sum: string
    rain_sum: string
    showers_sum: string
    snowfall_sum: string
    precipitation_hours: string
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    sunrise: string[]
    sunset: string[]
    daylight_duration: number[]
    sunshine_duration: number[]
    precipitation_sum: number[]
    rain_sum: number[]
    showers_sum: number[]
    snowfall_sum: number[]
    precipitation_hours: number[]
  }
}
