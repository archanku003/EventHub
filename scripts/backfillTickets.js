// Backfill script: populate ticket_id (and optionally ticket_qr) for registrations missing a ticket.
// Usage:
//   set SUPABASE_URL and SUPABASE_SERVICE_KEY (service role key) in env, then run:
//     node scripts/backfillTickets.js

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const QRCode = require("qrcode");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log("Fetching registrations missing ticket_id...");
  // Optional filters can be provided via env:
  // FILTER_USER_ID - only backfill for this user
  // FILTER_EVENT_ID - only backfill for this event
  const filterUser = process.env.FILTER_USER_ID;
  const filterEvent = process.env.FILTER_EVENT_ID;

  let query = supabase.from("registrations").select("id, user_id, event_id, ticket_id, ticket_qr").is("ticket_id", null);
  if (filterUser) {
    console.log("Applying filter: user_id =", filterUser);
    query = query.eq("user_id", filterUser);
  }
  if (filterEvent) {
    console.log("Applying filter: event_id =", filterEvent);
    query = query.eq("event_id", filterEvent);
  }
  const { data: rows, error: fetchError } = await query.limit(5000);

  if (fetchError) {
    console.error("Failed to fetch registrations:", fetchError);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log("No registrations to backfill.");
    return;
  }

  console.log(`Backfilling ${rows.length} registrations...`);
  for (const r of rows) {
    const ticketId = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    // Attempt to generate a QR code data URL for the new ticket
    let qrDataUrl = null;
    try {
      const payload = JSON.stringify({ ticketId, eventId: r.event_id, userId: r.user_id });
      qrDataUrl = await QRCode.toDataURL(payload);
    } catch (e) {
      console.warn("Failed to generate QR for", r.id, e && e.message ? e.message : e);
      qrDataUrl = null;
    }

    const { error: upErr } = await supabase
      .from("registrations")
      .update({ ticket_id: ticketId, ticket_qr: qrDataUrl, ticket_issued_at: new Date().toISOString() })
      .eq("id", r.id);
    if (upErr) {
      console.error("Failed to update registration", r.id, upErr.message || upErr);
    } else {
      console.log("Backfilled registration", r.id);
    }
  }

  console.log("Done.");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
