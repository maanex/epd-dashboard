

export namespace DatetimeUtils {

  export function renderDayDelta(date: Date) {
    const today = new Date()
    const inputDate = new Date(date)

    today.setHours(0, 0, 0, 0)
    inputDate.setHours(0, 0, 0, 0)

    const timeDifference = inputDate.getTime() - today.getTime()
    const dayDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24))

    if (dayDifference === 0)
      return 'today'
    if (dayDifference === 1)
      return 'tomorrow'
    if (dayDifference === -1)
      return 'yesterday'
    else if (dayDifference > 30)
      return `in ${Math.round(dayDifference/7)} weeks`
    else if (dayDifference > 0)
      return `in ${dayDifference} days`
    else if (dayDifference < -30)
      return `${Math.round(-dayDifference/7)} weeks ago`
    else
      return `${-dayDifference} days ago`
  }

  export function getCurrentQuaterHour() {
    const date = new Date(Date.now() - 1000 * 60)
    return date.getHours() * 4 + Math.floor(date.getMinutes() / 15)
  }

  export function getCurrentHour() {
    // Return the current hour minus one minute to avoid issues with data freshness
    return new Date(Date.now() - 1000 * 60).getHours()
  }

  export function getCurrentDay() {
    // Return the current day minus two hours
    return new Date(Date.now() - 1000 * 60 * 60 * 2)
  }

}
