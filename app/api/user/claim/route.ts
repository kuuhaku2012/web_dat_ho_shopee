import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/auth';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';
import { getStore } from '@/lib/db';
import { allowClaim, rateLimitKey } from '@/lib/limit';
import { JsonBodyError, readJsonLimited } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  const userId = readCustomerSession(request.cookies.get(customerCookie)?.value);
  if (!userId) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  if (!allowClaim(rateLimitKey(request))) return NextResponse.json({ error: 'Vui lòng thử lại sau một phút.' }, { status: 429 });
  try {
    const { id } = await readJsonLimited(request, 200) as { id?: unknown };
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return NextResponse.json({ error: 'Mã yêu cầu không hợp lệ.' }, { status: 400 });
    if (!getStore().claimRequest(id, userId)) return NextResponse.json({ error: 'Không tìm thấy yêu cầu chưa liên kết với số điện thoại của bạn.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof JsonBodyError ? error.message : 'Dữ liệu không hợp lệ.' }, { status: error instanceof JsonBodyError ? error.status : 400 }); }
}
