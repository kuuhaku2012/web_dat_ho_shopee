import { NextRequest, NextResponse } from 'next/server';
import { createSession, sameOrigin, sessionCookie, verifyPassword } from '@/lib/auth';
import { allowLogin } from '@/lib/limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  if (!allowLogin()) return NextResponse.json({ error: 'Thử lại sau một phút.' }, { status: 429 });
  const { password } = await request.json().catch(() => ({}));
  if (typeof password !== 'string' || password.length > 200 || !verifyPassword(password)) return NextResponse.json({ error: 'Mật khẩu không đúng.' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, createSession(), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 });
  return response;
}
