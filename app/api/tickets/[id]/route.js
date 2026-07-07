import { NextResponse } from "next/server";
import { getTicket, updateTicket } from "../../../../lib/store";

export async function GET(_req, { params }) {
  const ticket = getTicket(params.id);
  if (!ticket) {
    return NextResponse.json({ error: "Retour niet gevonden." }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const ticket = getTicket(params.id);
    
    if (!ticket) {
      return NextResponse.json({ error: "Retour niet gevonden." }, { status: 404 });
    }

    // Only allow updating trackingNumber from the status page
    const updates = {};
    if (body.trackingNumber !== undefined) {
      updates.trackingNumber = body.trackingNumber;
    }

    const updated = updateTicket(params.id, updates);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating ticket:", err);
    return NextResponse.json({ error: "Fout bij bijwerken retour" }, { status: 500 });
  }
}

