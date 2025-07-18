import { google } from 'googleapis'
import * as fs from 'fs/promises'
import * as path from 'path'
import consola from 'consola'
import type { OAuth2Client } from 'google-auth-library'

const CREDENTIALS_PATH = path.join(import.meta.dirname, '..', '..', 'credentials', 'client_secret.json')
const TOKEN_PATH = path.join(import.meta.dirname, '..', '..', 'credentials', 'token.json')

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks.readonly'
]

async function listCalendars(auth: any) {
  const calendar = google.calendar({ version: 'v3', auth })
  const res = await calendar.calendarList.list()
  return res.data.items ?? []
}

async function listTasks(auth: any) {
  const tasks = google.tasks({ version: 'v1', auth })
  const res = await tasks.tasklists.list()
  if (!res.data.items?.length)
    return []

  const entries = await Promise.all(res.data.items.map(async list => {
    const res2 = await tasks.tasks.list({
      tasklist: list.id!,
      maxResults: 10,
      auth
    })
    if (!res2.data.items?.length)
      return []
    return res2.data.items.map(task => ({
      ...task,
      partOf: list
    }))
  }))

  return entries
    .flat()
    .sort((a, b) => {
      const aDate = new Date(a.due || Number.MAX_SAFE_INTEGER)
      const bDate = new Date(b.due || Number.MAX_SAFE_INTEGER)
      return aDate.getTime() - bDate.getTime()
    })
}

async function listUpcomingEvents(auth: any, calendarId: string) {
  const calendar = google.calendar({ version: 'v3', auth })
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const res = await calendar.events.list({
    calendarId: calendarId,
    timeMin: startOfDay.toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return res.data.items ?? []
}

type Filter = {
  whitelist?: Array<RegExp | string>
  blacklist?: Array<RegExp | string>
  dummy?: boolean
}

async function fetch(authClient: OAuth2Client, filter?: Filter) {
  consola.withTag('gCalendar').info('Fetching calendar data')
  let calendars = await listCalendars(authClient)

  if (filter?.whitelist) {
    calendars = calendars.filter(calendar => filter.whitelist?.some(wl => {
      if (typeof wl === 'string')
        return calendar.id?.includes(wl)
      if (wl instanceof RegExp)
        return wl.test(calendar.id ?? '')
    }))
  }
  if (filter?.blacklist) {
    calendars = calendars.filter(calendar => !filter.blacklist?.some(bl => {
      if (typeof bl === 'string')
        return calendar.id?.includes(bl)
      if (bl instanceof RegExp)
        return bl.test(calendar.id ?? '')
    }))
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const mapped = await Promise.all(calendars.map(async (calendar) => {
    const events = await listUpcomingEvents(authClient, calendar.id!)
    return events.map(event => {
      const start = new Date(event.start?.dateTime || event.start?.date || 0)
      const end = new Date(event.end?.dateTime || event.end?.date || 0)
      const isAllDay = end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000
      const isMultiDay = isAllDay && (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000)
      const multiDayCount = isMultiDay ? Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) : -1
      const multiDayCurrent = isMultiDay ? Math.floor((new Date().getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) : -1
      const isToday = start.getTime() <= endOfToday.getTime() && end.getTime() >= startOfToday.getTime()
      const isUpcoming = start.getTime() > endOfToday.getTime()

      return {
        ...event,
        start,
        end,
        isOver: end.getTime() < new Date().getTime(),
        isToday,
        isAllDay,
        isMultiDay,
        multiDayCount,
        multiDayCurrent,
        isUpcoming,
        summary: event.summary || '(no title)',
        calendar
      }
    })
  }))

  const events = mapped
    .flat()
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const tasks = await listTasks(authClient)

  return {
    events,
    tasks
  }
}

async function createGapiClient() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf8')
    const credentials = JSON.parse(content)
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

    oAuth2Client.on('tokens', async (tokens) => {
      consola.withTag('gCalendar').info('Saving new tokens')
      try {
        const currentRaw = await fs.readFile(TOKEN_PATH, 'utf8')
        const currentJson = JSON.parse(currentRaw)
        for (const key in tokens)
          currentJson[key] = tokens[key as keyof typeof tokens]
        await fs.writeFile(TOKEN_PATH, JSON.stringify(currentJson))
      } catch {
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens))
      }
    })

    try {
      const token = await fs.readFile(TOKEN_PATH, 'utf8')
      oAuth2Client.setCredentials(JSON.parse(token))
      return oAuth2Client
    } catch (err: any) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      })
      consola.warn('Google API Credentials not found. Please sign in.')
      consola.log(authUrl)

      const code = await consola.prompt('Enter the code from that page here: ')

      try {
        const tokenResponse = await oAuth2Client.getToken(String(code))
        oAuth2Client.setCredentials(tokenResponse.tokens)
        return oAuth2Client
      } catch (err: any) {
        consola.error('Error retrieving access token', err)
        throw err
      }
    }
  } catch (err: any) {
    consola.error('Error loading client secret file:', err)
    throw err
  }
}

export const useGCalendarApi = async (filter?: Filter) => {
  if (filter?.dummy) {
    consola.withTag('gCalendar').info('Using dummy data for GCalendar API')
    return {
      getData: () => ({
        events: [],
        tasks: []
      }),
      refresh: async () => {},
      assertRecentData: async () => {}
    }
  }

  const client = await createGapiClient()
  let data = await fetch(client, filter)
  let dataTime = Date.now()

  async function refresh() {
    data = { events: [], tasks: [] } // reset data to avoid showing stale data
    data = await fetch(client, filter)
    dataTime = Date.now()
  }

  async function assertRecentData() {
    if (Date.now() - dataTime > 1000 * 60 * 30) // 30 minutes
      await refresh()
  }

  return {
    getData: () => data,
    refresh,
    assertRecentData
  }
}

export type GCalendarApi = Awaited<ReturnType<typeof useGCalendarApi>>
