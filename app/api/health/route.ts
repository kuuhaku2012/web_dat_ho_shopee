import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';

export const runtime = 'nodejs';

export function GET() {
  try {
    if (!getStore().checkHealth()) throw new Error('Database unavailable');
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
