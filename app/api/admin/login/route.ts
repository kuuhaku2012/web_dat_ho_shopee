import { NextRequest, NextResponse } from 'next/server';
import { createSession, sameOrigin, sessionCookie, verifyAdminCredentials } from '@/lib/auth';
import { allowLogin, rateLimitKey } from '@/lib/limit';
import { JsonBodyError, readJsonLimited } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  if (!allowLogin(rateLimitKey(request))) return NextResponse.json({ error: 'Thử lại sau một phút.' }, { status: 429 });
  let data: Record<string, unknown>;
  try {
    const parsed = await readJsonLimited(request, 1024);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    data = parsed as Record<string, unknown>;
  } catch (error) { return NextResponse.json({ error: error instanceof JsonBodyError ? error.message : 'Dữ liệu không hợp lệ.' }, { status: error instanceof JsonBodyError ? error.status : 400 }); }
  const { username, password } = data;
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length > 200 || !verifyAdminCredentials(username, password)) return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, createSession(), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 });
  return response;
}
