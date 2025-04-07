import { google } from 'googleapis'
import * as fs from 'fs/promises'
import * as path from 'path'
import consola from 'consola'

const CREDENTIALS_PATH = path.join(import.meta.dirname, '..', '..', 'credentials', 'client_secret.json')
const TOKEN_PATH = path.join(import.meta.dirname, '..', '..', 'credentials', 'token.json')

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

async function authorize() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf8')
    const credentials = JSON.parse(content)
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

    try {
      const token = await fs.readFile(TOKEN_PATH, 'utf8')
      oAuth2Client.setCredentials(JSON.parse(token))
      return oAuth2Client
    } catch (err: any) {
      return getNewToken(oAuth2Client)
    }
  } catch (err: any) {
    consola.error('Error loading client secret file:', err)
    throw err
  }
}

async function getNewToken(oAuth2Client: any) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })
  consola.warn('Google API Credentials not found. Please sign in.')
  consola.log(authUrl)

  const code = await consola.prompt('Enter the code from that page here: ')

  try {
    const tokenResponse = await oAuth2Client.getToken(code)
    oAuth2Client.setCredentials(tokenResponse.tokens)
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokenResponse.tokens))
    consola.success('Token stored to', TOKEN_PATH)
    return oAuth2Client
  } catch (err: any) {
    consola.error('Error retrieving access token', err)
    throw err
  }
}

async function listCalendars(auth: any) {
  const calendar = google.calendar({ version: 'v3', auth })
  const res = await calendar.calendarList.list()
  return res.data.items ?? []
}

async function listUpcomingEvents(auth: any, calendarId: string) {
  const calendar = google.calendar({ version: 'v3', auth })
  const res = await calendar.events.list({
    calendarId: calendarId,
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  })
  return res.data.items ?? []
}

type Filter = {
  whitelist?: Array<RegExp | string>
  blacklist?: Array<RegExp | string>
}

export const useGCalendarApi = async (filter?: Filter) => {
  const authClient = await authorize()
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

  const list = await Promise.all(calendars.map(async (calendar) => {
    const events = await listUpcomingEvents(authClient, calendar.id!)
    return {
      ...calendar,
      events: events.map(event => ({
        ...event,
        start: new Date(event.start?.dateTime || event.start?.date || 0).getTime(),
        end: new Date(event.end?.dateTime || event.end?.date || 0).getTime(),
        summary: event.summary || 'No Title',
        calendarId: calendar.id
      }))
    }
  }))

  const upcoming = list
    .flatMap(calendar => calendar.events)
    .sort((a, b) => a.start - b.start)
    .slice(0, 10)

  return {
    list,
    upcoming
  }
}

export type GCalendarApi = Awaited<ReturnType<typeof useGCalendarApi>>
