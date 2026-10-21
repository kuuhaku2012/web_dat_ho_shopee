import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/auth';
import { createCustomerSession, customerCookie, hashCustomerPassword, validateCustomerFields } from '@/lib/customer-auth';
import { getStore } from '@/lib/db';
import { allowCustomerAuth, rateLimitKey } from '@/lib/limit';
import { JsonBodyError, readJsonLimited } from '@/lib/http';
import { requirePrivacyConsent } from '@/lib/privacy';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  if (!allowCustomerAuth(rateLimitKey(request))) return NextResponse.json({ error: 'Vui lòng thử lại sau một phút.' }, { status: 429 });
  try {
    const payload = await readJsonLimited(request, 1000);
    const consentVersion = requirePrivacyConsent(payload);
    const { name, phone, password } = validateCustomerFields(payload, true);
    const store = getStore();
    if (store.getCustomerByPhone(phone)) return NextResponse.json({ error: 'Số điện thoại đã được đăng ký.' }, { status: 409 });
    const user = store.createCustomer(name, phone, hashCustomerPassword(password), consentVersion);
    const response = NextResponse.json({ ok: true }, { status: 201 });
    response.cookies.set(customerCookie, createCustomerSession(user.id), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 30 * 24 * 60 * 60 });
    return response;
  } catch (error) {
    if (error instanceof JsonBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Error && /^(Dữ liệu|Vui lòng|Số điện thoại|Mật khẩu)/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Không thể đăng ký. Vui lòng thử lại.' }, { status: 500 });
  }
}
