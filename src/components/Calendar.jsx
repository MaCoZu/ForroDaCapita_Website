// src/components/Calendar.jsx
import dayGridPlugin from "@fullcalendar/daygrid";
import googleCalendarPlugin from "@fullcalendar/google-calendar";
import icalendarPlugin from "@fullcalendar/icalendar";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from '@fullcalendar/list';
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useState } from "react";
const PUBLIC_GOOGLE_CALENDAR_API = import.meta.env.PUBLIC_GOOGLE_CALENDAR_API;
const CALENDARS = [
  {
    id: "google1",
    name: "Forró Events Berlin",
    type: "google",
    googleCalendarId: '07c417b521afc7b8414afde550cf09110d2c4fdde7ec0c9d52ea128af408a0c8@group.calendar.google.com',
    apiKey: PUBLIC_GOOGLE_CALENDAR_API
  },
  {
    id: "google2",
    name: "Forró Festivals",
    type: "google",
    googleCalendarId: '461ab8f7bd299b50a2efa341b484823005ce98f170b8a64a52b672776df37bec@group.calendar.google.com',
    apiKey: PUBLIC_GOOGLE_CALENDAR_API
  },
  {
    id: "google3",
    name: "Forró Hamburg",
    type: "google",
    googleCalendarId: 'forro-projeto.de_u4gs17r6ubue5hitis4h626d7k@group.calendar.google.com',
    apiKey: PUBLIC_GOOGLE_CALENDAR_API
  },


];

export default function Calendar() {
  const [visibleCalendars, setVisibleCalendars] = useState(
    CALENDARS.length > 0 ? [CALENDARS[0].id] : []
  );

  // Build eventSources for FullCalendar
  const eventSources = CALENDARS.filter(cal => visibleCalendars.includes(cal.id)).map(cal => {
    if (cal.type === "google") {
      return {
        googleCalendarId: cal.googleCalendarId,
        apiKey: cal.apiKey,
        id: cal.id,
        className: cal.id
      };
    } else if (cal.type === "ical") {
      return {
        url: cal.url,
        format: "ics",
        id: cal.id,
        className: cal.id
      };
    }
    return null;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        {CALENDARS.map(cal => (
          <label key={cal.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={visibleCalendars.includes(cal.id)}
              onChange={() =>
                setVisibleCalendars(v => {
                  const newVisible = [...v];
                  if (newVisible.includes(cal.id)) {
                    newVisible.splice(newVisible.indexOf(cal.id), 1);
                  } else {
                    newVisible.push(cal.id);
                  }
                  return newVisible;
                })
              }
            />
            {cal.name}
          </label>
        ))}
      </div>
      <FullCalendar
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
          googleCalendarPlugin,
          icalendarPlugin,
          listPlugin
        ]}
        initialView="dayGridMonth"
        eventSources={eventSources}
        googleCalendarApiKey={PUBLIC_GOOGLE_CALENDAR_API}
        height="auto"
        headerToolbar={{
          left: 'prev next today',
          center: "title",
          right: "dayGridMonth timeGridWeek listWeek"
        }}
      />
    </div>
  );
}