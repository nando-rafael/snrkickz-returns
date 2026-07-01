import { createClient } from "@supabase/supabase-js";

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }
  return supabaseClient;
}

export async function createTicket(ticket) {
  console.log("[DB] Creating ticket:", ticket.id);
  const { data, error } = await getSupabase()
    .from("tickets")
    .insert([ticket])
    .select();

  if (error) {
    console.error("[DB] Error creating ticket:", error);
    throw error;
  }
  console.log("[DB] Ticket created successfully:", data[0].id);
  return data[0];
}

export async function getTicket(id) {
  console.log("[DB] Fetching ticket:", id);
  const { data, error } = await getSupabase()
    .from("tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[DB] Error fetching ticket:", error);
    throw error;
  }
  console.log("[DB] Ticket fetched:", data?.id || "not found");
  return data || null;
}

export async function updateTicket(id, patch) {
  console.log("[DB] Updating ticket:", id, patch);
  const { data, error } = await getSupabase()
    .from("tickets")
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) {
    console.error("[DB] Error updating ticket:", error);
    throw error;
  }
  console.log("[DB] Ticket updated successfully:", data[0].id);
  return data[0];
}

export async function listTickets() {
  console.log("[DB] Listing all tickets");
  const { data, error } = await getSupabase()
    .from("tickets")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("[DB] Error listing tickets:", error);
    throw error;
  }
  console.log("[DB] Fetched", data.length, "tickets");
  return data;
}

export function generateTicketId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RET-${rand}`;
}

