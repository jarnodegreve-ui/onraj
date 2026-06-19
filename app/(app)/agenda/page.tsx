import { addMonths, startOfMonth, subMonths } from "date-fns";

import { AgendaView } from "@/components/agenda/agenda-view";
import { currentDayKey, upcomingEvents } from "@/lib/agenda";
import { listEvents } from "@/lib/data/events";
import { getGoogleEvents, isGoogleConnected } from "@/lib/data/google";
import { currentMonthKey } from "@/lib/month";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { CalendarEvent } from "@/lib/types";

export default async function AgendaPage() {
  if (!supabaseConfigured) {
    return (
      <AgendaView
        events={[]}
        upcoming={[]}
        initialMonth={currentMonthKey()}
        todayKey={currentDayKey()}
        googleConnected={false}
        preview
      />
    );
  }

  const localEvents = await listEvents();
  const googleConnected = await isGoogleConnected();

  let googleEvents: CalendarEvent[] = [];
  if (googleConnected) {
    const now = new Date();
    const timeMin = startOfMonth(subMonths(now, 1)).toISOString();
    const timeMax = startOfMonth(addMonths(now, 3)).toISOString();
    googleEvents = await getGoogleEvents(timeMin, timeMax);
  }

  const events = [...localEvents, ...googleEvents];
  const upcoming = upcomingEvents(events, new Date(), 5);

  return (
    <AgendaView
      events={events}
      upcoming={upcoming}
      initialMonth={currentMonthKey()}
      todayKey={currentDayKey()}
      googleConnected={googleConnected}
      preview={false}
    />
  );
}
