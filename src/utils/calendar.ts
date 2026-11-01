import { EventDetails } from '../types';

/**
 * Formats date and time into YYYYMMDDTHHmmss string format for calendars
 */
export function formatCalendarDateTime(dateStr: string, timeStr: string, addHours: number = 0): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = (timeStr || '19:30').split(':').map(Number);

    const d = new Date(year, month - 1, day, hours + addHours, minutes, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = '00';

    return `${y}${m}${dayStr}T${h}${min}${s}`;
  } catch {
    // Fallback if parsing fails
    const cleanDate = dateStr.replace(/-/g, '');
    const cleanTime = (timeStr || '19:30').replace(':', '') + '00';
    return `${cleanDate}T${cleanTime}`;
  }
}

/**
 * Generates direct Google Calendar event creation URL
 */
export function getGoogleCalendarUrl(event: EventDetails): string {
  const start = formatCalendarDateTime(event.date, event.time, 0);
  // Default party duration: 4.5 hours
  const end = formatCalendarDateTime(event.date, event.time, 4.5);

  const celebrant = event.celebrantName.includes('קלזן')
    ? event.celebrantName
    : `${event.celebrantName} קלזן`;
  const title = `בת המצווה של ${celebrant} 🎉`;
  const location = `${event.venueName}, ${event.address}`;
  const details = `${event.welcomeMessage}\n\nמיקום: ${location}\nניווט ב-Waze: ${event.wazeUrl}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: details,
    location: location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an iCalendar (.ics) content string formatted per RFC 5545
 * Compatible with Apple Calendar (iOS, macOS), Outlook, and Android.
 */
export function generateIcsContent(event: EventDetails): string {
  const start = formatCalendarDateTime(event.date, event.time, 0);
  const end = formatCalendarDateTime(event.date, event.time, 4.5);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const celebrant = event.celebrantName.includes('קלזן')
    ? event.celebrantName
    : `${event.celebrantName} קלזן`;
  const title = `בת המצווה של ${celebrant} 🎉`;
  const location = `${event.venueName}, ${event.address}`;
  const description = `${event.welcomeMessage}\\n\\nמיקום: ${location}\\nניווט ב-Waze: ${event.wazeUrl}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bat Mitzvah RSVP//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:bat-mitzvah-${event.celebrantName}-${Date.now()}@ais-applet`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:תזכורת: בת המצווה של ${celebrant} מחר! 🎉`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:תזכורת: בת המצווה של ${celebrant} מתחילה בעוד שעתיים! 🥂`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Downloads or opens the .ics file for Apple Calendar (iPhone/iPad/Mac)
 */
export function downloadAppleCalendarIcs(event: EventDetails): void {
  const icsData = generateIcsContent(event);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `בת-המצווה-של-${event.celebrantName}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
