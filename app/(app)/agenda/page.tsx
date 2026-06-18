import { AgendaView } from "@/components/agenda/agenda-view";
import { currentDayKey, upcomingEvents } from "@/lib/agenda";
import { listEvents } from "@/lib/data/events";
import { currentMonthKey } from "@/lib/month";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function AgendaPage() {
  const events = supabaseConfigured ? await listEvents() : [];
  const upcoming = upcomingEvents(events, new Date(), 5);

  return (
    <AgendaView
      events={events}
      upcoming={upcoming}
      initialMonth={currentMonthKey()}
      todayKey={currentDayKey()}
      preview={!supabaseConfigured}
    />
  );
}
