import { NextResponse } from 'next/server';
import { getTicket, updateTicket } from '../../../../../lib/store';

function checkAuth(request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return { error: 'ADMIN_PASSWORD not set', status: 503 };
  }
  
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  const token = authHeader.slice(7);
  if (token !== adminPassword) {
    return { error: 'Invalid token', status: 401 };
  }
  
  return null;
}

export async function PATCH(request, { params }) {
  const authError = checkAuth(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }
  
  const body = await request.json();
  const ticket = getTicket(params.id);
  if (!ticket) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
  const updated = updateTicket(params.id, { status: body.status });
  return NextResponse.json(updated);
}

