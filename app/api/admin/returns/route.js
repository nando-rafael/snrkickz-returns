import { NextResponse } from 'next/server';
import { listTickets } from '../../../../lib/store';

export async function GET() {
  try {
    const returns = listTickets();
    return NextResponse.json({ returns });
  } catch (err) {
    console.error('Admin returns error:', err);
    return NextResponse.json({ returns: [] });
  }
}

