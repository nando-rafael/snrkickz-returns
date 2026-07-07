import { NextResponse } from 'next/server';
import { listTickets } from '../../../../lib/store';

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

export async function GET(request) {
  const authError = checkAuth(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }
  
  try {
    const returns = listTickets();
    return NextResponse.json({ returns });
  } catch (err) {
    console.error('Admin returns error:', err);
    return NextResponse.json({ returns: [] });
  }
}

