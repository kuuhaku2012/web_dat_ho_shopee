import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/auth';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';
import { getStore } from '@/lib/db';
import { JsonBodyError, readJsonLimited } from '@/lib/http';
import { allowPrivacyRequests, rateLimitKey } from '@/lib/limit';
import { parsePrivacyRequest } from '@/lib/privacy';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  if (!allowPrivacyRequests(rateLimitKey(request))) return NextResponse.json({ error: 'Bạn thử lại sau một phút.' }, { status: 429 });
  let input: ReturnType<typeof parsePrivacyRequest>;
  try { input = parsePrivacyRequest(await readJsonLimited(request, 1500)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Dữ liệu không hợp lệ.' }, { status: error instanceof JsonBodyError ? error.status : 400 }); }

  const store = getStore();
  const userId = readCustomerSession(request.cookies.get(customerCookie)?.value);
  if (userId) {
    const user = store.getCustomer(userId);
    if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập lại.' }, { status: 401 });
    const privacyRequest = store.createPrivacyRequest({ type: input.type, userId, phone: user.phone, message: input.message });
    return NextResponse.json({ id: privacyRequest.id }, { status: 201 });
  }
  if (!input.requestId || !input.phone) return NextResponse.json({ error: 'Nhập mã yêu cầu và số điện thoại đã dùng.' }, { status: 400 });
  const target = store.getRequest(input.requestId);
  if (!target || target.phone !== input.phone) return NextResponse.json({ error: 'Không tìm thấy yêu cầu khớp với thông tin đã nhập.' }, { status: 404 });
  const privacyRequest = store.createPrivacyRequest({ type: input.type, requestId: target.id, phone: target.phone, message: input.message });
  return NextResponse.json({ id: privacyRequest.id }, { status: 201 });
}
