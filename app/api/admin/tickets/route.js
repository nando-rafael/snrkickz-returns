import { NextResponse } from "next/server";
import { listTickets } from "../../../../lib/store";

export async function GET() {
  const tickets = listTickets();
  return NextResponse.json({ tickets });
}
