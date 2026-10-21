import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/auth';
import { getStore } from '@/lib/db';
import { allowAccountLookup, rateLimitKey } from '@/lib/limit';
import { JsonBodyError, readJsonLimited } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403, headers });
  if (!allowAccountLookup(rateLimitKey(request))) return NextResponse.json({ error: 'Bạn thử lại sau một phút.' }, { status: 429, headers });
  try {
    const data = await readJsonLimited(request, 500) as { id?: unknown; phone?: unknown };
    const id = typeof data.id === 'string' ? data.id.trim() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
    if (!/^[a-f0-9-]{36}$/i.test(id) || phone.length > 30) return NextResponse.json({ error: 'Mã yêu cầu hoặc số điện thoại không hợp lệ.' }, { status: 400, headers });
    const accounts = getStore().lookupDeliveredAccounts(id, phone);
    if (!accounts) return NextResponse.json({ error: 'Chưa có tài khoản để nhận. Kiểm tra mã, số điện thoại hoặc thử lại sau khi admin hoàn tất yêu cầu.' }, { status: 404, headers });
    return NextResponse.json({ accounts }, { headers });
  } catch (error) { return NextResponse.json({ error: error instanceof JsonBodyError ? error.message : 'Dữ liệu không hợp lệ.' }, { status: error instanceof JsonBodyError ? error.status : 400, headers }); }
}
