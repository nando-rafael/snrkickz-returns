import { NextResponse } from "next/server";
import { getTicket, updateTicket } from "../../../../../lib/store";
import config from "../../../../../lib/config";

export async function GET(_req, { params }) {
  const ticket = getTicket(params.id);
  if (!ticket) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function PATCH(req, { params }) {
  const body = await req.json();
  const { status, adminNote } = body;

  if (status && !Object.values(config.TICKET_STATUS).includes(status)) {
    return NextResponse.json({ error: "Ongeldige status." }, { status: 400 });
  }

  const ticket = updateTicket(params.id, {
    ...(status ? { status } : {}),
    ...(adminNote !== undefined ? { adminNote } : {}),
  });

  if (!ticket) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  return NextResponse.json({ ticket });
}
