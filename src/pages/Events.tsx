import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(start: string, end?: string) {
  const to12Hour = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };
  if (!end) return to12Hour(start);
  return `${to12Hour(start)} - ${to12Hour(end)}`;
}
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";


// Helper to determine event status
// Improved: uses both date and end_time
export function getEventStatus(eventDate: string, startTime?: string, endTime?: string): "ongoing" | "today" | "tomorrow" | "upcoming" | "completed" {
  const now = new Date();
  const eventDateObj = new Date(eventDate);
  // Get only the date part for both
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDateOnly = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate());
  const diffDays = Math.floor((eventDateOnly.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "completed";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === 0) {
    if (startTime && endTime) {
      // Parse start and end time (HH:mm)
      const [startHour, startMinute] = startTime.split(":");
      const [endHour, endMinute] = endTime.split(":");
      const eventStart = new Date(eventDateOnly);
      eventStart.setHours(Number(startHour), Number(startMinute), 0, 0);
      const eventEnd = new Date(eventDateOnly);
      eventEnd.setHours(Number(endHour), Number(endMinute), 0, 0);
      if (now >= eventStart && now <= eventEnd) {
        return "ongoing";
      }
      if (now > eventEnd) {
        return "completed";
      }
    }
    return "today";
  }
  if (diffDays > 1) return "upcoming";
  return "upcoming";
}

const Events = () => {

  const [filter, setFilter] = useState<string>("all");
  // Removed typeFilter state
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<string[]>([]); // event ids
  const { toast } = useToast();
  // Fetch registrations for logged-in user
  useEffect(() => {
    const fetchRegistrations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from("registrations").select("event_id").eq("user_id", user.id);
        if (!error && data) {
          setRegistrations((data as { event_id: string }[]).map((r) => r.event_id));
        }
      } else {
        setRegistrations([]);
      }
    };
    fetchRegistrations();
  }, []);
  // Registration handler
  const handleRegister = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please log in to register for events." });
      return;
    }
    const { error } = await supabase
      .from("registrations")
      .insert([
        { user_id: user.id, event_id: eventId }
      ] as any);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registered!", description: "You have registered for the event." });
      setRegistrations((prev) => [...prev, eventId]);
    }
  };

  // Cancel registration handler
  const handleCancel = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId);
    if (!error) {
      setRegistrations((prev) => prev.filter((id) => id !== eventId));
      toast({ title: "Registration cancelled." });
    }
  };

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("events").select("*");
      if (error) {
        setError("Failed to fetch events.");
        setEvents([]);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  // Add status to each event (removed daysToGo)
  const eventsWithStatus = events.map((event) => {
    const status = getEventStatus(event.date, event.time, event.end_time);
    return { ...event, status };
  });


  // Removed eventTypes

  const filteredEvents = eventsWithStatus.filter((event) => {
    const statusMatch = filter === "all" ? true : event.status === filter;
    return statusMatch;
  });

  // Separate and order events: upcoming/today/tomorrow first, completed last
  const statusOrder = (status: string) => {
    if (status === "ongoing") return 0;
    if (status === "today") return 1;
    if (status === "tomorrow") return 2;
    if (status === "upcoming") return 3;
    if (status === "completed") return 4;
    return 5;
  };
  let orderedEvents = filteredEvents.slice();
  if (filter === "all") {
    orderedEvents = filteredEvents.slice().sort((a, b) => {
      if (statusOrder(a.status) !== statusOrder(b.status)) {
        return statusOrder(a.status) - statusOrder(b.status);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }


  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              Discover Events
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse through exciting college events and register for your favorites
            </p>
          </div>


          {/* Filters */}
          <div className="mb-8 flex flex-col gap-4 items-center">
            {/* Status filter */}
            <Tabs value={filter} onValueChange={setFilter} className="w-full max-w-2xl">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Type filter removed */}
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Loading events...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">{error}</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orderedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    name={event.title}
                    venue={event.location || ""}
                    formattedDate={formatDate(event.date)}
                    time={formatTimeRange(event.time, event.end_time)}
                    collegeName={event.university_name || ""}
                    image={event.image || ""}
                    status={event.status}
                    description={event.description}
                    onRegister={() => handleRegister(event.id)}
                    onCancel={() => handleCancel(event.id)}
                    isRegistered={registrations.includes(event.id)}
                    isFirstTime={registrations.length === 0}
                  />
                ))}
              </div>
              {filteredEvents.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No events found for this filter.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Events;
