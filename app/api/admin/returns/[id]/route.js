import { NextResponse } from 'next/server';
import { getTicket, updateTicket } from '../../../../../lib/store';

export async function PATCH(request, { params }) {
  const body = await request.json();
  const ticket = getTicket(params.id);
  if (!ticket) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
  const updated = updateTicket(params.id, { status: body.status });
  return NextResponse.json(updated);
}

