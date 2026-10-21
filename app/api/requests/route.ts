import { NextRequest, NextResponse } from 'next/server';
import { getStore, IdempotencyConflictError } from '@/lib/db';
import { allowSubmission, rateLimitKey } from '@/lib/limit';
import { isIdempotencyKey, parseRequest, ValidationError } from '@/lib/requests';
import { createPaymentDetails } from '@/lib/payment';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';
import { JsonBodyError, readJsonLimited } from '@/lib/http';
import { requirePrivacyConsent } from '@/lib/privacy';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!allowSubmission(rateLimitKey(request))) return NextResponse.json({ error: 'Hệ thống đang nhận nhiều yêu cầu. Vui lòng thử lại sau một phút.' }, { status: 429 });
  const idempotencyKey = request.headers.get('Idempotency-Key') || '';
  if (!isIdempotencyKey(idempotencyKey)) return NextResponse.json({ error: 'Yêu cầu thiếu mã gửi hợp lệ. Hãy tải lại trang rồi thử lại.' }, { status: 400 });
  try {
    const payload = await readJsonLimited(request, 5000);
    const consentVersion = requirePrivacyConsent(payload);
    const input = parseRequest(payload);
    const userId = readCustomerSession(request.cookies.get(customerCookie)?.value);
    const saved = getStore().createRequest(input, userId || undefined, consentVersion, idempotencyKey);
    const payment = saved.type === 'order' ? createPaymentDetails(saved.id, saved.feeAmount) : null;
    return NextResponse.json({ id: saved.id, payment }, { status: 201 });
  } catch (error) {
    if (error instanceof JsonBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof IdempotencyConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof ValidationError || (error instanceof Error && /^(Vui lòng đọc|Số điện thoại không khớp)/.test(error.message))) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Không thể lưu yêu cầu. Vui lòng thử lại.' }, { status: 500 });
  }
}
