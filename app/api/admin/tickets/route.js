import { NextResponse } from "next/server";
import { listTickets } from "../../../../lib/db";

export async function GET() {
  try {
    console.log("[ADMIN] GET /api/admin/tickets - Fetching all tickets");
    const tickets = await listTickets();
    console.log("[ADMIN] Returning", tickets.length, "tickets");
    return NextResponse.json({ tickets });
  } catch (err) {
    console.error("[ADMIN] Error fetching tickets:", err);
    return NextResponse.json({ error: "Failed to fetch tickets: " + err.message }, { status: 500 });
  }
}

