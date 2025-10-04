
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/EventCard";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(start: string, end: string) {
  const to12Hour = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };
  return `${to12Hour(start)} - ${to12Hour(end)}`;
}
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      setRegistrations((prev) => prev.filter((reg) => reg.event?.id !== eventId));
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // Fetch profile
      const { data: profileData } = await supabase.from("users").select("*").eq("id", user.id).single();
      setProfile(profileData);

      // Fetch registrations with event details
      const { data: regData } = await supabase
        .from("registrations")
        .select("*, event:events(*)")
        .eq("user_id", user.id);
      setRegistrations(regData || []);
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Your Dashboard</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {profile && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold">Welcome, {profile.name}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
              </div>
            )}
            <h2 className="text-xl font-semibold mb-4">Your Registered Events</h2>
            {registrations.length === 0 ? (
              <p>You have not registered for any events yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {registrations.map((reg) =>
                  reg.event ? (
                    <EventCard
                      key={reg.event.id}
                      id={reg.event.id}
                      name={reg.event.title}
                      venue={reg.event.location || ""}
                      formattedDate={formatDate(reg.event.date)}
                      time={formatTimeRange(reg.event.time, reg.event.end_time)}
                      collegeName={reg.event.university_name || ""}
                      image={reg.event.image || ""}
                      status={"upcoming"}
                      isRegistered
                      onCancel={() => handleCancel(reg.event.id)}
                    />
                  ) : null
                )}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
