import { NextResponse } from "next/server";
import { getTicket } from "../../../../lib/store";

export async function GET(_req, { params }) {
  const ticket = getTicket(params.id);
  if (!ticket) {
    return NextResponse.json({ error: "Retour niet gevonden." }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}
