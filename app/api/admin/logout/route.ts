import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, sessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(sessionCookie);
  return response;
}
