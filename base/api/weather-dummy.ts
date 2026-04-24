/**
 * Slopcoded dummy weather data generator.
 */

import { getDayLength } from "../lib/sun-position"
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

type Daily = {
	time: string
	regime: WeatherRegime
	weatherCode: number
	temperatureMax: number
	temperatureMin: number
	sunrise: string
	sunset: string
	daylightDuration: number
	sunshineDuration: number
	precipitationSum: number
	rainSum: number
	showersSum: number
	snowfallSum: number
	precipitationHours: number
}

type WeatherRegime = 'clear' | 'cloudy' | 'foggy' | 'drizzle' | 'rain' | 'snow' | 'thunder'

const latitude = 49.579
const longitude = 11.018
const dayCount = 12
const hourlyDayOffset = -1
const weatherCodes = {
	clear: [0, 1, 2],
	cloudy: [3],
	foggy: [45, 48],
	drizzle: [51, 53, 55, 56, 57],
	rain: [61, 63, 65, 66, 67, 80, 81, 82],
	snow: [71, 73, 75, 77, 85, 86],
	thunder: [95, 96, 99],
} as const

function randomBetween(min: number, max: number) {
	return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number) {
	return Math.floor(randomBetween(min, max + 1))
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value))
}

function round1(value: number) {
	return Math.round(value * 10) / 10
}

function pick<T>(values: readonly T[]) {
	return values[randomInt(0, values.length - 1)]
}

function pickWeighted<T>(entries: readonly { value: T, weight: number }[]) {
	const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
	let roll = Math.random() * total

	for (const entry of entries) {
		roll -= entry.weight
		if (roll <= 0)
			return entry.value
	}

	return entries[entries.length - 1].value
}

function startOfLocalDay(date: Date) {
	const copy = new Date(date)
	copy.setHours(0, 0, 0, 0)
	return copy
}

function addDays(date: Date, days: number) {
	const copy = new Date(date)
	copy.setDate(copy.getDate() + days)
	return copy
}

function addHours(date: Date, hours: number) {
	const copy = new Date(date)
	copy.setHours(copy.getHours() + hours)
	return copy
}

function pad(value: number) {
	return String(value).padStart(2, '0')
}

function formatLocalDate(date: Date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatLocalDateTime(date: Date) {
	return `${formatLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function dayOfYear(date: Date) {
	const start = new Date(date.getFullYear(), 0, 0)
	const diff = date.getTime() - start.getTime()
	return Math.floor(diff / 86400000)
}

function pickWeatherCode(theme: 'clear' | 'cloudy' | 'foggy' | 'drizzle' | 'rain' | 'snow' | 'thunder', intensity: number) {
	switch (theme) {
		case 'clear':
			return pick(weatherCodes.clear)
		case 'cloudy':
			return intensity > 70 ? 3 : pick(weatherCodes.clear)
		case 'foggy':
			return pick(weatherCodes.foggy)
		case 'drizzle':
			return pick(weatherCodes.drizzle)
		case 'rain':
			return pick(weatherCodes.rain)
		case 'snow':
			return pick(weatherCodes.snow)
		case 'thunder':
			return pick(weatherCodes.thunder)
	}
}

function pickInitialRegime(temperatureMax: number): WeatherRegime {
	if (temperatureMax <= 0) {
		return pickWeighted([
			{ value: 'snow', weight: 4 },
			{ value: 'foggy', weight: 2 },
			{ value: 'cloudy', weight: 2 },
			{ value: 'clear', weight: 1 },
		])
	}

	if (temperatureMax <= 8) {
		return pickWeighted([
			{ value: 'cloudy', weight: 4 },
			{ value: 'drizzle', weight: 3 },
			{ value: 'rain', weight: 3 },
			{ value: 'foggy', weight: 2 },
			{ value: 'clear', weight: 2 },
		])
	}

	if (temperatureMax <= 18) {
		return pickWeighted([
			{ value: 'clear', weight: 4 },
			{ value: 'cloudy', weight: 4 },
			{ value: 'drizzle', weight: 2 },
			{ value: 'rain', weight: 2 },
			{ value: 'foggy', weight: 1 },
		])
	}

	return pickWeighted([
		{ value: 'clear', weight: 5 },
		{ value: 'cloudy', weight: 3 },
		{ value: 'rain', weight: 2 },
		{ value: 'thunder', weight: 2 },
		{ value: 'foggy', weight: 1 },
	])
}

function pickNextRegime(previous: WeatherRegime, temperatureMax: number): WeatherRegime {
	if (temperatureMax <= 0) {
		switch (previous) {
			case 'snow': return pickWeighted([
				{ value: 'snow', weight: 5 },
				{ value: 'cloudy', weight: 2 },
				{ value: 'foggy', weight: 2 },
				{ value: 'clear', weight: 1 },
			])
			case 'foggy': return pickWeighted([
				{ value: 'foggy', weight: 4 },
				{ value: 'snow', weight: 3 },
				{ value: 'cloudy', weight: 2 },
				{ value: 'clear', weight: 1 },
			])
			case 'cloudy': return pickWeighted([
				{ value: 'cloudy', weight: 4 },
				{ value: 'snow', weight: 3 },
				{ value: 'foggy', weight: 2 },
				{ value: 'clear', weight: 1 },
			])
			default: return pickWeighted([
				{ value: 'snow', weight: 4 },
				{ value: 'cloudy', weight: 2 },
				{ value: 'foggy', weight: 2 },
				{ value: 'clear', weight: 1 },
			])
		}
	}

	switch (previous) {
		case 'clear': return pickWeighted([
			{ value: 'clear', weight: 5 },
			{ value: 'cloudy', weight: 3 },
			{ value: 'drizzle', weight: 1.5 },
			{ value: 'rain', weight: 1 },
			{ value: 'foggy', weight: 1 },
		])
		case 'cloudy': return pickWeighted([
			{ value: 'cloudy', weight: 4 },
			{ value: 'clear', weight: 2 },
			{ value: 'drizzle', weight: 2 },
			{ value: 'rain', weight: 1.5 },
			{ value: 'foggy', weight: 1 },
		])
		case 'foggy': return pickWeighted([
			{ value: 'foggy', weight: 4 },
			{ value: 'cloudy', weight: 3 },
			{ value: 'clear', weight: 2 },
			{ value: 'drizzle', weight: 1 },
			{ value: 'rain', weight: 1 },
		])
		case 'drizzle': return pickWeighted([
			{ value: 'drizzle', weight: 4 },
			{ value: 'rain', weight: 3 },
			{ value: 'cloudy', weight: 2 },
			{ value: 'clear', weight: 1 },
		])
		case 'rain': return pickWeighted([
			{ value: 'rain', weight: 5 },
			{ value: 'drizzle', weight: 2 },
			{ value: 'cloudy', weight: 2 },
			{ value: 'thunder', weight: 1 },
			{ value: 'clear', weight: 1 },
		])
		case 'snow': return pickWeighted([
			{ value: 'snow', weight: 5 },
			{ value: 'cloudy', weight: 2 },
			{ value: 'foggy', weight: 2 },
			{ value: 'clear', weight: 1 },
		])
		case 'thunder': return pickWeighted([
			{ value: 'thunder', weight: 3 },
			{ value: 'rain', weight: 4 },
			{ value: 'cloudy', weight: 2 },
			{ value: 'clear', weight: 1 },
		])
	}
}

function pickRunLength(regime: WeatherRegime) {
	switch (regime) {
		case 'rain':
		case 'snow':
		case 'thunder':
			return randomInt(2, 4)
		case 'drizzle':
		case 'foggy':
			return randomInt(1, 3)
		default:
			return randomInt(1, 3)
	}
}

function buildDay(baseDate: Date, relativeDay: number, regime: WeatherRegime, previousTemperatureMax?: number): Daily {
	const date = addDays(baseDate, relativeDay)
	const yday = dayOfYear(date)
	const seasonal = Math.sin(((yday - 80) / 365) * Math.PI * 2)

	const baseMax = 13 + seasonal * 10
	const frontTrend = previousTemperatureMax === undefined ? baseMax : previousTemperatureMax + randomBetween(-1.2, 1.8)
	const regimeOffset = regime === 'clear' ? 1.5
		: regime === 'cloudy' ? 0.5
			: regime === 'foggy' ? -0.5
				: regime === 'drizzle' ? -1.2
					: regime === 'rain' ? -1.8
						: regime === 'snow' ? -5.5
							: 0.3
	const temperatureMax = clamp(round1(baseMax * 0.7 + frontTrend * 0.3 + regimeOffset + randomBetween(-2, 2)), -12, 36)
	const spread = regime === 'snow' ? randomBetween(4, 8)
		: regime === 'clear' ? randomBetween(8, 14)
			: regime === 'cloudy' ? randomBetween(6, 12)
				: regime === 'foggy' ? randomBetween(3, 8)
					: randomBetween(4, 10)
	const temperatureMin = clamp(round1(temperatureMax - spread - (seasonal < 0 ? randomBetween(0, 2.5) : 0)), -18, temperatureMax - 0.5)

	const daylightHours = clamp(round1(getDayLength(yday, latitude) + randomBetween(-0.75, 0.75)), 7.5, 16.75)
	const solarMidpoint = 12 + randomBetween(-0.4, 0.4)
	const sunriseHour = solarMidpoint - daylightHours / 2
	const sunsetHour = solarMidpoint + daylightHours / 2

	const sunrise = new Date(date)
	sunrise.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0)
	const sunset = new Date(date)
	sunset.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0)

	const cloudCover = clamp(round1(
		regime === 'clear' ? randomBetween(0, 28)
			: regime === 'cloudy' ? randomBetween(45, 88)
				: regime === 'foggy' ? randomBetween(55, 95)
					: regime === 'drizzle' ? randomBetween(40, 82)
						: regime === 'rain' ? randomBetween(60, 98)
							: regime === 'snow' ? randomBetween(55, 100)
								: randomBetween(70, 100)
	), 0, 100)

	const precipitationHours = clamp(round1(
		regime === 'clear' ? randomBetween(0, 1.5)
			: regime === 'cloudy' ? randomBetween(0, 2.5)
				: regime === 'foggy' ? randomBetween(0, 1)
					: regime === 'drizzle' ? randomBetween(1, 5)
						: regime === 'rain' ? randomBetween(2, 9)
							: regime === 'snow' ? randomBetween(1, 6)
								: randomBetween(1, 4)
	), 0, 24)

	const precipitationSum = clamp(round1(
		regime === 'clear' ? randomBetween(0, 0.4)
			: regime === 'cloudy' ? randomBetween(0, 1)
				: regime === 'foggy' ? randomBetween(0, 0.3)
					: regime === 'drizzle' ? randomBetween(0.2, 2.5)
						: regime === 'rain' ? randomBetween(1, 12)
							: regime === 'snow' ? randomBetween(0.5, 8)
								: randomBetween(2, 18)
	), 0, 99)

	const snowFactor = regime === 'snow' ? 0.9 : regime === 'thunder' && temperatureMin <= 0 ? 0.2 : 0
	const snowfallSum = clamp(round1(precipitationSum * snowFactor), 0, precipitationSum)
	const rainSum = clamp(round1(regime === 'snow' ? precipitationSum * 0.15 : precipitationSum * (regime === 'drizzle' || regime === 'rain' || regime === 'thunder' ? 0.82 : 0.45)), 0, precipitationSum)
	const showersSum = clamp(round1(regime === 'rain' || regime === 'thunder' ? precipitationSum * 0.55 : regime === 'drizzle' ? precipitationSum * 0.25 : precipitationSum * 0.08), 0, precipitationSum)

	return {
		time: formatLocalDate(date),
		regime,
		weatherCode: pickWeatherCode(regime, cloudCover),
		temperatureMax,
		temperatureMin,
		sunrise: formatLocalDateTime(sunrise),
		sunset: formatLocalDateTime(sunset),
		daylightDuration: daylightHours,
		sunshineDuration: clamp(round1(daylightHours * (1 - cloudCover / 140) * (regime === 'clear' ? 1 : regime === 'cloudy' ? 0.9 : regime === 'foggy' ? 0.6 : 0.75)), 0, daylightHours),
		precipitationSum,
		rainSum,
		showersSum,
		snowfallSum,
		precipitationHours,
	}
}

function buildHourly(baseDate: Date, days: Daily[]) {
	const out: Hourly[] = []

	for (let dayOffset = hourlyDayOffset; dayOffset < dayCount - 1; dayOffset++) {
		const dayDate = addDays(baseDate, dayOffset)
		const day = days[dayOffset + 1]
		const sunriseHour = new Date(day.sunrise).getHours() + new Date(day.sunrise).getMinutes() / 60
		const sunsetHour = new Date(day.sunset).getHours() + new Date(day.sunset).getMinutes() / 60

		for (let hour = 0; hour < 24; hour++) {
			const dayProgress = clamp((hour - sunriseHour) / Math.max(sunsetHour - sunriseHour, 1), 0, 1)
			const dailyCurve = Math.sin(Math.PI * dayProgress)
			const baseTemperature = day.temperatureMin + (day.temperatureMax - day.temperatureMin) * Math.max(0, dailyCurve)
			const temperature = clamp(round1(baseTemperature + randomBetween(-1.4, 1.4)), -20, 40)

			const nighttime = hour < sunriseHour || hour > sunsetHour
			const weatherIntensity = clamp(
				day.weatherCode >= 95 ? randomBetween(75, 100)
					: day.weatherCode >= 90 ? randomBetween(70, 100)
						: day.weatherCode >= 80 ? randomBetween(45, 85)
							: day.weatherCode >= 70 ? randomBetween(30, 80)
								: day.weatherCode >= 50 ? randomBetween(20, 65)
									: day.weatherCode === 45 || day.weatherCode === 48 ? randomBetween(55, 95)
										: randomBetween(0, 35),
				0,
				100
			)

			const cloudCover = clamp(round1(
				day.weatherCode >= 95 ? randomBetween(78, 100)
					: day.weatherCode >= 80 ? randomBetween(58, 98)
						: day.weatherCode >= 70 ? randomBetween(55, 95)
							: day.weatherCode >= 50 ? randomBetween(35, 86)
								: day.weatherCode === 45 || day.weatherCode === 48 ? randomBetween(72, 100)
									: randomBetween(0, 45)
			) + (nighttime ? randomBetween(5, 18) : 0), 0, 100)

			const precipitationProbability = clamp(round1(
				day.weatherCode >= 95 ? randomBetween(65, 100)
					: day.weatherCode >= 80 ? randomBetween(40, 95)
						: day.weatherCode >= 70 ? randomBetween(25, 70)
							: day.weatherCode >= 50 ? randomBetween(15, 65)
								: day.weatherCode === 45 || day.weatherCode === 48 ? randomBetween(5, 20)
									: randomBetween(0, 18)
			) + (cloudCover - 50) / 4 + (nighttime ? 4 : -2) + (hour >= 13 && hour <= 19 ? 8 : 0), 0, 100)

			let weatherCode = day.weatherCode
			if (day.weatherCode === 0 || day.weatherCode === 1 || day.weatherCode === 2 || day.weatherCode === 3) {
				if (cloudCover > 80 && precipitationProbability > 20)
					weatherCode = pick(weatherCodes.cloudy)
				else if (cloudCover > 55)
					weatherCode = 2
				else
					weatherCode = pick(weatherCodes.clear)
			} else if (day.weatherCode === 45 || day.weatherCode === 48) {
				weatherCode = pick(weatherCodes.foggy)
			} else if (day.weatherCode >= 50 && day.weatherCode < 60) {
				weatherCode = precipitationProbability > 55 ? pick(weatherCodes.drizzle) : pick(weatherCodes.cloudy)
			} else if (day.weatherCode >= 60 && day.weatherCode < 70) {
				weatherCode = precipitationProbability > 70 ? pick(weatherCodes.rain) : pick([61, 63, 80, 81] as const)
			} else if (day.weatherCode >= 70 && day.weatherCode < 80) {
				weatherCode = temperature <= 0 || precipitationProbability > 50 ? pick(weatherCodes.snow) : pick(weatherCodes.cloudy)
			} else if (day.weatherCode >= 80 && day.weatherCode < 90) {
				weatherCode = precipitationProbability > 80 ? pick(weatherCodes.rain) : pick([80, 81, 82] as const)
			} else if (day.weatherCode >= 95) {
				weatherCode = hour >= 12 && hour <= 21 && precipitationProbability > 70
					? pick(weatherCodes.thunder)
					: pick(weatherCodes.rain)
			}

			const precipitation = clamp(round1(
				precipitationProbability <= 18 ? 0
					: weatherCode >= 95 ? randomBetween(0.4, 3.2)
						: weatherCode >= 80 ? randomBetween(0.2, 2.4)
							: weatherCode >= 70 ? randomBetween(0.05, 1.6)
								: weatherCode >= 50 ? randomBetween(0.05, 0.8)
									: randomBetween(0, 0.1)
			), 0, 25)

			out.push({
				hour,
				temperature,
				humidity: clamp(round1(
					100 - temperature * 1.7 + cloudCover * 0.35 + (precipitationProbability / 6) + randomBetween(-10, 10)
				), 10, 100),
				precipitationProbability,
				precipitation,
				weatherCode,
				cloudCover,
			})
		}
	}

	return out
}

function createWeatherData(): WeatherData {
	const baseDate = startOfLocalDay(new Date())
	const dailyEntries: Daily[] = []
	const initialSeasonalMax = 13 + Math.sin(((dayOfYear(baseDate) - 80) / 365) * Math.PI * 2) * 10
	let previousTemperatureMax: number | undefined
	let activeRegime = pickInitialRegime(initialSeasonalMax)
	let regimeDaysLeft = pickRunLength(activeRegime)

	for (let day = -1; day < dayCount - 1; day++) {
		if (regimeDaysLeft <= 0) {
			activeRegime = pickNextRegime(activeRegime, previousTemperatureMax ?? initialSeasonalMax)
			regimeDaysLeft = pickRunLength(activeRegime)
		}

		const entry = buildDay(baseDate, day, activeRegime, previousTemperatureMax)
		dailyEntries.push(entry)
		previousTemperatureMax = entry.temperatureMax
		regimeDaysLeft -= 1
	}

	const hourlyEntries = buildHourly(baseDate, dailyEntries)

	return {
		latitude,
		longitude,
		generationtime_ms: round1(randomBetween(20, 120)),
		utc_offset_seconds: -new Date().getTimezoneOffset() * 60,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Berlin',
		timezone_abbreviation: 'local',
		elevation: round1(randomBetween(250, 600)),
		hourly_units: {
			time: 'iso8601',
			temperature_2m: '°C',
			relative_humidity_2m: '%',
			precipitation_probability: '%',
			precipitation: 'mm',
			weather_code: 'wmo code',
			cloud_cover: '%',
		},
		hourly: {
			time: hourlyEntries.map((_, index) => formatLocalDateTime(addHours(addDays(baseDate, hourlyDayOffset), index))),
			temperature_2m: hourlyEntries.map(entry => entry.temperature),
			relative_humidity_2m: hourlyEntries.map(entry => entry.humidity),
			precipitation_probability: hourlyEntries.map(entry => entry.precipitationProbability),
			precipitation: hourlyEntries.map(entry => entry.precipitation),
			weather_code: hourlyEntries.map(entry => entry.weatherCode),
			cloud_cover: hourlyEntries.map(entry => entry.cloudCover),
		},
		daily_units: {
			time: 'iso8601',
			weather_code: 'wmo code',
			temperature_2m_max: '°C',
			temperature_2m_min: '°C',
			sunrise: 'iso8601',
			sunset: 'iso8601',
			daylight_duration: 'h',
			sunshine_duration: 'h',
			precipitation_sum: 'mm',
			rain_sum: 'mm',
			showers_sum: 'mm',
			snowfall_sum: 'cm',
			precipitation_hours: 'h',
		},
		daily: {
			time: dailyEntries.map(entry => entry.time),
			weather_code: dailyEntries.map(entry => entry.weatherCode),
			temperature_2m_max: dailyEntries.map(entry => entry.temperatureMax),
			temperature_2m_min: dailyEntries.map(entry => entry.temperatureMin),
			sunrise: dailyEntries.map(entry => entry.sunrise),
			sunset: dailyEntries.map(entry => entry.sunset),
			daylight_duration: dailyEntries.map(entry => entry.daylightDuration),
			sunshine_duration: dailyEntries.map(entry => entry.sunshineDuration),
			precipitation_sum: dailyEntries.map(entry => entry.precipitationSum),
			rain_sum: dailyEntries.map(entry => entry.rainSum),
			showers_sum: dailyEntries.map(entry => entry.showersSum),
			snowfall_sum: dailyEntries.map(entry => entry.snowfallSum),
			precipitation_hours: dailyEntries.map(entry => entry.precipitationHours),
		},
	}
}

export const useWeatherDummy = async () => {
	let data = createWeatherData()

	async function refresh() {
		data = createWeatherData()
	}

	async function assertRecentData() {
		await refresh()
	}

	function getDay(relative: number) {
		return {
			weatherCode: data.daily.weather_code[relative + 1],
			temperatureMax: data.daily.temperature_2m_max[relative + 1],
			temperatureMin: data.daily.temperature_2m_min[relative + 1],
			sunrise: new Date(data.daily.sunrise[relative + 1]),
			sunset: new Date(data.daily.sunset[relative + 1]),
			daylightDuration: data.daily.daylight_duration[relative + 1],
			sunshineDuration: data.daily.sunshine_duration[relative + 1],
			precipitationSum: data.daily.precipitation_sum[relative + 1],
			rainSum: data.daily.rain_sum[relative + 1],
			showersSum: data.daily.showers_sum[relative + 1],
			snowfallSum: data.daily.snowfall_sum[relative + 1],
			precipitationHours: data.daily.precipitation_hours[relative + 1]
		}
	}

	function getToday() {
		return getDay(0)
	}

	function daysUntil(date: Date) {
		const now = new Date(Date.now() - 2 * 60 * 60 * 1000)
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

export type WeatherApi = Awaited<ReturnType<typeof useWeatherDummy>>
