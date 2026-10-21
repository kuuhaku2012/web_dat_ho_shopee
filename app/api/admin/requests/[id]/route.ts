import { NextRequest, NextResponse } from 'next/server';
import { readSession, sameOrigin, sessionCookie } from '@/lib/auth';
import { getStore } from '@/lib/db';
import type { PaymentStatus, Status } from '@/lib/requests';
import { parseDeliveredAccounts } from '@/lib/account-delivery';
import { JsonBodyError, readJsonLimited } from '@/lib/http';

export const runtime = 'nodejs';
const statuses: Status[] = ['new', 'processing', 'completed', 'cancelled'];
const paymentStatuses: PaymentStatus[] = ['not_required', 'pending', 'confirmed'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!readSession(request.cookies.get(sessionCookie)?.value)) return NextResponse.json({ error: 'Cần đăng nhập.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  let data: Record<string, unknown>;
  try {
    const parsed = await readJsonLimited(request, 12000);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    data = parsed as Record<string, unknown>;
  } catch (error) { return NextResponse.json({ error: error instanceof JsonBodyError ? error.message : 'Dữ liệu không hợp lệ.' }, { status: error instanceof JsonBodyError ? error.status : 400 }); }
  if (!statuses.includes(data.status as Status) || typeof data.internalNote !== 'string' || data.internalNote.length > 2000) return NextResponse.json({ error: 'Trạng thái hoặc ghi chú không hợp lệ.' }, { status: 400 });
  const paymentStatus = data.paymentStatus as PaymentStatus | undefined;
  if (paymentStatus !== undefined && !paymentStatuses.includes(paymentStatus)) return NextResponse.json({ error: 'Trạng thái thanh toán không hợp lệ.' }, { status: 400 });
  const id = (await params).id;
  const current = getStore().getRequest(id);
  if (!current) return NextResponse.json({ error: 'Không tìm thấy yêu cầu.' }, { status: 404 });
  if (current.type === 'account' && paymentStatus && paymentStatus !== 'not_required') return NextResponse.json({ error: 'Yêu cầu tài khoản chưa có thanh toán.' }, { status: 400 });
  if (current.type === 'order' && paymentStatus === 'not_required' && current.feeAmount > 0) return NextResponse.json({ error: 'Đơn đặt hộ phải có trạng thái thanh toán.' }, { status: 400 });
  if (current.type === 'order' && current.feeAmount > 0 && data.status === 'completed' && (paymentStatus ?? current.paymentStatus) !== 'confirmed') return NextResponse.json({ error: 'Chỉ hoàn tất sau khi xác nhận thanh toán phí công.' }, { status: 400 });
  let accounts;
  if (current.type === 'account') {
    try {
      if (data.accountsText !== undefined && data.accountsText !== '') accounts = parseDeliveredAccounts(data.accountsText, current.quantity);
      if (data.status === 'completed' && !accounts && !getStore().getDeliveredAccounts(id)) return NextResponse.json({ error: 'Hãy nhập tài khoản trước khi đánh dấu hoàn tất.' }, { status: 400 });
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Thông tin tài khoản không hợp lệ.' }, { status: 400 }); }
  }
  if (accounts) getStore().saveDeliveredAccounts(id, accounts);
  const saved = getStore().updateRequest(id, data.status as Status, data.internalNote.trim(), paymentStatus);
  return saved ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Không tìm thấy yêu cầu.' }, { status: 404 });
}
