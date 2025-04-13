

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
    else if (dayDifference > 0)
      return `in ${dayDifference} ${dayDifference === 1 ? 'day' : 'days'}`
    else
      return `${-dayDifference} ${dayDifference === -1 ? 'day' : 'days'} ago`
  }

}
