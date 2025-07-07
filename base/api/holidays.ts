

type Holiday = {
  id: string
  startDate: string
  endDate: string
  type: string
  name: Array<{
    language: string
    text: string
  }>
  regionalScope: string
  temporalScope: string
  nationwide: boolean
  subdivisions?: Array<{
    code: string
    shortName: string
  }>
}

export const useHolidaysApi = async () => {
  const fetchApi = async () => {
    const from = new Date().toISOString().split('T')[0]
    const until = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]
    const response = await fetch(`https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${from}&validTo=${until}`)
    const data = await response.json()
    return data as Holiday[]
  }

  let data = await fetchApi()
  let dataTime = Date.now()

  async function refresh() {
    data = await fetchApi()
    dataTime = Date.now()
  }

  async function assertRecentData() {
    if (Date.now() - dataTime > 1000 * 60 * 30) // 30 minutes
      await refresh()
  }

  //

  function isHolidayAtHome(holly: Holiday) {
    return holly.nationwide || (holly.regionalScope === 'Regional' && holly.subdivisions?.some(sub => sub.code === 'DE-BY'))
  }

  function isHolidayInXDays(x: number) {
    const date = new Date(Date.now() + x * 1000 * 60 * 60 * 24)
    const dateString = date.toISOString().split('T')[0]
    return data.some(holly => isHolidayAtHome(holly) && holly.startDate === dateString)
  }

  return {
    data,
    isHolidayInXDays,
    refresh,
    assertRecentData
  }
}

export type HolidaysApi = Awaited<ReturnType<typeof useHolidaysApi>>
