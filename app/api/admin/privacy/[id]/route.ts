import { NextRequest, NextResponse } from 'next/server';
import { readSession, sameOrigin, sessionCookie } from '@/lib/auth';
import { getStore } from '@/lib/db';
import { JsonBodyError, readJsonLimited } from '@/lib/http';
import type { PrivacyRequestStatus } from '@/lib/privacy';

export const runtime = 'nodejs';
const statuses: PrivacyRequestStatus[] = ['new', 'processing', 'completed', 'rejected'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!readSession(request.cookies.get(sessionCookie)?.value)) return NextResponse.json({ error: 'Cần đăng nhập.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  let data: Record<string, unknown>;
  try {
    const parsed = await readJsonLimited(request, 2500);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    data = parsed as Record<string, unknown>;
  } catch (error) { return NextResponse.json({ error: error instanceof JsonBodyError ? error.message : 'Dữ liệu không hợp lệ.' }, { status: error instanceof JsonBodyError ? error.status : 400 }); }
  if (!statuses.includes(data.status as PrivacyRequestStatus) || typeof data.internalNote !== 'string' || data.internalNote.length > 2000 || (data.erase !== undefined && typeof data.erase !== 'boolean')) return NextResponse.json({ error: 'Trạng thái hoặc ghi chú không hợp lệ.' }, { status: 400 });
  const id = (await params).id;
  if (!getStore().getPrivacyRequest(id)) return NextResponse.json({ error: 'Không tìm thấy yêu cầu quyền dữ liệu.' }, { status: 404 });
  try {
    const saved = getStore().updatePrivacyRequest(id, data.status as PrivacyRequestStatus, data.internalNote.trim(), data.erase === true);
    return saved ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Không tìm thấy yêu cầu quyền dữ liệu.' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu.' }, { status: 400 }); }
}
