import { NextResponse } from 'next/server';
import { listTickets } from '../../../../lib/store';

export async function GET() {
  const returns = listTickets();
  return NextResponse.json({ returns });
}
