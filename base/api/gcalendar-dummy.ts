type CalendarRef = {
	id: string
	title: string
}

type DummyEvent = {
	summary: string
	start: Date
	end: Date
	calendar: CalendarRef
	isOver: boolean
	isToday: boolean
	isAllDay: boolean
	isMultiDay: boolean
	multiDayCount: number
	multiDayCurrent: number
	isUpcoming: boolean
}

type DummyTask = {
	id: string
	title: string
	due?: string
	partOf: CalendarRef
}

type DummyCalendarData = {
	events: DummyEvent[]
	tasks: DummyTask[]
}

type EventTemplate =
	| {
		type: 'allDay'
		summary: string
		dayOffset: number
		durationDays: number
		calendar: CalendarRef
	}
	| {
		type: 'timed'
		summary: string
		dayOffset: number
		startHour: number
		startMinute: 0 | 30
		durationMinutes: number
		calendar: CalendarRef
	}

type TaskTemplate = {
	id: string
	title: string
	due?: {
		dayOffset: number
		hour: number
		minute: 0 | 30
	}
	partOf: CalendarRef
}

type Filter = {
	whitelist?: Array<RegExp | string>
	blacklist?: Array<RegExp | string>
	dummy?: boolean
}

const calendars = {
	default: { id: 'caroline-ma11s9l5fagk@gmail.com', title: 'Meine Aufgaben' },
	work: { id: 'team-planning-a7f62b9c2c26@group.calendar.google.com', title: 'Arbeit' },
	family: { id: 'family-4a0d085fecdb@group.calendar.google.com', title: 'Familie' },
	home: { id: 'home-g4krado1rk7k@group.calendar.google.com', title: 'Zuhause' },
	projects: { id: 'projects-desk-1@group.calendar.google.com', title: 'Projekte' },
} satisfies Record<string, CalendarRef>

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

function atLocalTime(day: Date, hours: number, minutes: number) {
	const copy = new Date(day)
	copy.setHours(hours, minutes, 0, 0)
	return copy
}

function randomInt(min: number, max: number) {
	return Math.floor(min + Math.random() * (max - min + 1))
}

function randomDayAnchor() {
	return randomInt(-3, 4)
}

function shuffle<T>(values: readonly T[]) {
	return [...values].sort(() => Math.random() - 0.5)
}

function sampleCount(min: number, max: number) {
	return randomInt(min, max)
}

function almostAlwaysCount(min: number, max: number, missChance = 0.1) {
	if (Math.random() < missChance && min > 0)
		return min - 1
	return randomInt(min, max)
}

function buildEvent(summary: string, start: Date, end: Date, calendar: CalendarRef): DummyEvent {
	const now = new Date()
	const todayStart = startOfLocalDay(now)
	const todayEnd = new Date(todayStart)
	todayEnd.setHours(23, 59, 59, 999)
	const isAllDay = end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000
	const isMultiDay = isAllDay && (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000)
	const multiDayCount = isMultiDay ? Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) : -1
	const multiDayCurrent = isMultiDay ? Math.max(0, Math.floor((todayStart.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))) : -1
	const isToday = start.getTime() <= todayEnd.getTime() && end.getTime() >= todayStart.getTime()
	const isUpcoming = start.getTime() > todayEnd.getTime()

	return {
		summary,
		start,
		end,
		calendar,
		isOver: end.getTime() < now.getTime(),
		isToday,
		isAllDay,
		isMultiDay,
		multiDayCount,
		multiDayCurrent,
		isUpcoming,
	}
}

function createTimedEvent(summary: string, dayOffset: number, startHour: number, startMinute: number, durationMinutes: number, calendar: CalendarRef, baseDayOffset: number): DummyEvent {
	const day = addDays(startOfLocalDay(new Date()), dayOffset + baseDayOffset)
	const start = atLocalTime(day, startHour, startMinute)
	const end = new Date(start)
	end.setMinutes(end.getMinutes() + durationMinutes)
	return buildEvent(summary, start, end, calendar)
}

// Place timed templates into non-overlapping 30-minute slots between 06:00 and 24:00
function scheduleTimedTemplates(
 	templates: { summary: string; durationMinutes: number; calendar: CalendarRef }[],
 	dayOffset: number,
 	baseDayOffset: number,
) {
 	const SLOT_START_MIN = 6 * 60
 	const SLOT_END_MIN = 24 * 60
 	const SLOT_COUNT = (SLOT_END_MIN - SLOT_START_MIN) / 30 // 36 slots

 	const occupied = new Array(SLOT_COUNT).fill(false)
 	const out: DummyEvent[] = []

 	const order = shuffle(templates.map((t, i) => i))

 	for (const idx of order) {
 		const tpl = templates[idx]
 		const needed = Math.max(1, Math.ceil(tpl.durationMinutes / 30))
 		let placed = false

 		// try random placements
 		for (let attempt = 0; attempt < 40 && !placed; attempt++) {
 			const startSlot = randomInt(0, SLOT_COUNT - needed)
 			let ok = true
 			for (let s = startSlot; s < startSlot + needed; s++) {
 				if (occupied[s]) {
 					ok = false
 					break
 				}
 			}
 			if (!ok) continue

 			for (let s = startSlot; s < startSlot + needed; s++) occupied[s] = true
 			const startMinutes = SLOT_START_MIN + startSlot * 30
 			const hour = Math.floor(startMinutes / 60)
 			const minute = (startMinutes % 60) as 0 | 30
 			out.push(createTimedEvent(tpl.summary, dayOffset, hour, minute, needed * 30, tpl.calendar, baseDayOffset))
 			placed = true
 		}

 		if (!placed) {
 			// fallback: linear scan for first-fit
 			for (let s = 0; s <= SLOT_COUNT - needed; s++) {
 				let ok = true
 				for (let x = s; x < s + needed; x++) if (occupied[x]) { ok = false; break }
 				if (!ok) continue

 				for (let x = s; x < s + needed; x++) occupied[x] = true
 				const startMinutes = SLOT_START_MIN + s * 30
 				const hour = Math.floor(startMinutes / 60)
 				const minute = (startMinutes % 60) as 0 | 30
 				out.push(createTimedEvent(tpl.summary, dayOffset, hour, minute, needed * 30, tpl.calendar, baseDayOffset))
 				placed = true
 				break
 			}
 		}

 		if (!placed) {
 			// last resort: allow overlap, place at a random start
 			const startSlot = randomInt(0, SLOT_COUNT - needed)
 			const startMinutes = SLOT_START_MIN + startSlot * 30
 			const hour = Math.floor(startMinutes / 60)
 			const minute = (startMinutes % 60) as 0 | 30
 			out.push(createTimedEvent(tpl.summary, dayOffset, hour, minute, needed * 30, tpl.calendar, baseDayOffset))
 		}
 	}

 	return out
}

function createAllDayEvent(summary: string, dayOffset: number, durationDays: number, calendar: CalendarRef, baseDayOffset: number): DummyEvent {
	const start = addDays(startOfLocalDay(new Date()), dayOffset + baseDayOffset)
	const end = addDays(start, durationDays)
	return buildEvent(summary, start, end, calendar)
}

const eventPool: EventTemplate[] = [
	{ type: 'allDay', summary: 'Day of the Dingus', dayOffset: -1, durationDays: 3, calendar: calendars.family },
	{ type: 'allDay', summary: 'Package arrival (ominous)', dayOffset: 0, durationDays: 1, calendar: calendars.home },
	{ type: 'timed', summary: 'Warm weather warning', dayOffset: 0, startHour: 8, startMinute: 30, durationMinutes: 60, calendar: calendars.default },
	{ type: 'timed', summary: 'Q5 Sprint', dayOffset: 0, startHour: 9, startMinute: 30, durationMinutes: 30, calendar: calendars.work },
	{ type: 'timed', summary: 'Standup Meeting', dayOffset: 0, startHour: 10, startMinute: 30, durationMinutes: 120, calendar: calendars.projects },
	{ type: 'timed', summary: 'Piss yourself', dayOffset: 0, startHour: 12, startMinute: 30, durationMinutes: 90, calendar: calendars.default },
	{ type: 'timed', summary: 'Dentist surprise visit', dayOffset: 0, startHour: 15, startMinute: 30, durationMinutes: 30, calendar: calendars.default },
	{ type: 'timed', summary: 'Cat 1on1', dayOffset: 0, startHour: 17, startMinute: 30, durationMinutes: 60, calendar: calendars.home },
	{ type: 'timed', summary: 'Fight Jason', dayOffset: 0, startHour: 19, startMinute: 0, durationMinutes: 30, calendar: calendars.default },
	{ type: 'allDay', summary: 'National Wire Fraud Day', dayOffset: 1, durationDays: 1, calendar: calendars.family },
	{ type: 'timed', summary: 'Reschedule this', dayOffset: 1, startHour: 14, startMinute: 0, durationMinutes: 90, calendar: calendars.work },
	{ type: 'timed', summary: 'Some uhhhh i forgor', dayOffset: 1, startHour: 16, startMinute: 30, durationMinutes: 60, calendar: calendars.work },
	{ type: 'timed', summary: 'Get', dayOffset: 2, startHour: 9, startMinute: 30, durationMinutes: 60, calendar: calendars.default },
	{ type: 'allDay', summary: 'Fire susanna', dayOffset: 3, durationDays: 1, calendar: calendars.work },
	{ type: 'timed', summary: 'Gym', dayOffset: 3, startHour: 17, startMinute: 0, durationMinutes: 30, calendar: calendars.home },
	{ type: 'timed', summary: 'Running (away)', dayOffset: 4, startHour: 11, startMinute: 0, durationMinutes: 150, calendar: calendars.default },
	{ type: 'timed', summary: 'Gooning time slot', dayOffset: 4, startHour: 16, startMinute: 30, durationMinutes: 60, calendar: calendars.work },
	{ type: 'allDay', summary: 'Birthday', dayOffset: 5, durationDays: 2, calendar: calendars.default },
	{ type: 'timed', summary: 'Work', dayOffset: 5, startHour: 18, startMinute: 30, durationMinutes: 30, calendar: calendars.family },
	{ type: 'timed', summary: 'Flush the cocaine', dayOffset: 6, startHour: 7, startMinute: 30, durationMinutes: 60, calendar: calendars.default },
	{ type: 'timed', summary: 'Call don', dayOffset: 7, startHour: 14, startMinute: 0, durationMinutes: 90, calendar: calendars.work },
	{ type: 'allDay', summary: 'Mario', dayOffset: 8, durationDays: 1, calendar: calendars.home },
	{ type: 'timed', summary: 'Unrotate the cat (if necessary)', dayOffset: 9, startHour: 10, startMinute: 30, durationMinutes: 30, calendar: calendars.default },
	{ type: 'timed', summary: 'Jump once', dayOffset: 10, startHour: 13, startMinute: 0, durationMinutes: 90, calendar: calendars.projects },
]

const taskPool: TaskTemplate[] = [
	{ id: 'task-1', title: 'Commit tax evasion', due: { dayOffset: -2, hour: 16, minute: 0 }, partOf: calendars.default },
	{ id: 'task-2', title: 'Generate shareholder value', due: { dayOffset: -1, hour: 12, minute: 0 }, partOf: calendars.default },
	{ id: 'task-3', title: 'Water the shower', due: { dayOffset: 0, hour: 20, minute: 0 }, partOf: calendars.default },
	{ id: 'task-4', title: 'Rotate the cat', due: { dayOffset: 0, hour: 17, minute: 30 }, partOf: calendars.default },
	{ id: 'task-5', title: 'Blow up an ATM', due: { dayOffset: 3, hour: 10, minute: 0 }, partOf: calendars.default },
	{ id: 'task-6', title: 'Text mom "bfuaheifzen"', due: { dayOffset: 5, hour: 15, minute: 0 }, partOf: calendars.default },
	{ id: 'task-7', title: 'Forget something', partOf: calendars.default },
	{ id: 'task-8', title: 'Clean the chewing gum', partOf: calendars.default },
	{ id: 'task-9', title: 'Explode', partOf: calendars.default },
	{ id: 'task-10', title: 'Eliminate all sunflowers', partOf: calendars.default },
	{ id: 'task-11', title: 'Frederik', partOf: calendars.default },
	{ id: 'task-12', title: 'Photos Printed', partOf: calendars.default },
]

function createDummyEvents(baseDayOffset: number) {
	const allDayTemplates = eventPool.filter(e => e.type === 'allDay') as Extract<EventTemplate, { type: 'allDay' }>[]
	const timedTemplates = eventPool.filter(e => e.type === 'timed') as Extract<EventTemplate, { type: 'timed' }>[]

	// Ensure 1-3 all-day events for TODAY (dayOffset = 0)
	const numAllDayToday = randomInt(0, 3)
	const todayAllDay = shuffle(allDayTemplates).slice(0, numAllDayToday)

	// Additional future all-day events (0-2)
	const futureAllDay = shuffle(allDayTemplates.filter(t => !todayAllDay.includes(t))).slice(0, sampleCount(0, 2))

	// Ensure at least 2 timed events today between 06:00 and 24:00
	const numTimedToday = Math.max(2, sampleCount(2, 5))
	const todayTimedTemplates: { summary: string; durationMinutes: number; calendar: CalendarRef }[] = []
	for (let i = 0; i < numTimedToday; i++) {
		const tpl = timedTemplates[i % timedTemplates.length]
		// duration 30-180 in 30 increments
		const duration = 30 * randomInt(1, 6)
		todayTimedTemplates.push({ summary: tpl.summary, durationMinutes: duration, calendar: tpl.calendar })
	}

	// Additional timed events for future days (pick a handful)
	const futureRaw = shuffle(timedTemplates).slice(0, sampleCount(1, 5))

	// Build events so "today" templates map to the actual current day regardless of baseDayOffset
	const out: DummyEvent[] = []

	// today all-day
	for (const t of todayAllDay) {
		out.push(createAllDayEvent(t.summary, -baseDayOffset, t.durationDays, t.calendar, baseDayOffset))
	}

	// future all-day
	for (const t of futureAllDay) {
		out.push(createAllDayEvent(t.summary, t.dayOffset, t.durationDays, t.calendar, baseDayOffset))
	}


	// schedule today timed (avoid overlaps)
	const scheduledTodayTimed = scheduleTimedTemplates(todayTimedTemplates, -baseDayOffset, baseDayOffset)
	for (const e of scheduledTodayTimed) out.push(e)

	// schedule future timed events per dayOffset
	const byDay = new Map<number, { summary: string; durationMinutes: number; calendar: CalendarRef }[]>()
	for (const tpl of futureRaw) {
		const list = byDay.get(tpl.dayOffset) || []
		list.push({ summary: tpl.summary, durationMinutes: tpl.durationMinutes, calendar: tpl.calendar })
		byDay.set(tpl.dayOffset, list)
	}

	for (const [dayOffset, templates] of byDay.entries()) {
		const scheduled = scheduleTimedTemplates(templates, dayOffset, baseDayOffset)
		for (const e of scheduled) out.push(e)
	}

	return out.sort((a, b) => a.start.getTime() - b.start.getTime())
}

function createDummyTasks(baseDayOffset: number): DummyTask[] {
	const selectedTasks = shuffle(taskPool).slice(0, sampleCount(5, 9))

	return selectedTasks.map(task => ({
		id: task.id,
		title: task.title,
		partOf: task.partOf,
		due: task.due
			? atLocalTime(
				addDays(startOfLocalDay(new Date()), task.due.dayOffset + baseDayOffset),
				task.due.hour,
				task.due.minute,
			).toISOString()
			: undefined,
	}))
}

function matchesFilter(calendarId: string, filter?: Filter) {
	if (filter?.whitelist?.length) {
		const isWhitelisted = filter.whitelist.some(rule => typeof rule === 'string'
			? calendarId.includes(rule)
			: rule.test(calendarId))
		if (!isWhitelisted)
			return false
	}

	if (filter?.blacklist?.length) {
		const isBlacklisted = filter.blacklist.some(rule => typeof rule === 'string'
			? calendarId.includes(rule)
			: rule.test(calendarId))
		if (isBlacklisted)
			return false
	}

	return true
}

function createDummyData(filter?: Filter): DummyCalendarData {
	const baseDayOffset = randomDayAnchor()
	const events = createDummyEvents(baseDayOffset).filter(event => matchesFilter(event.calendar.id, filter))
	const tasks = createDummyTasks(baseDayOffset).filter(task => matchesFilter(task.partOf.id, filter))

	return {
		events,
		tasks,
	}
}

export const useGCalendarDummy = async (filter?: Filter) => {
	let data = createDummyData(filter)

	async function refresh() {
		data = createDummyData(filter)
	}

	async function assertRecentData() {
		await refresh()
	}

	return {
		getData: () => data,
		refresh,
		assertRecentData,
		isSignedOut: false,
		generateAuthUrl: () => '',
		provideAuthCode: async () => {},
	}
}

export type GCalendarDummyApi = Awaited<ReturnType<typeof useGCalendarDummy>>