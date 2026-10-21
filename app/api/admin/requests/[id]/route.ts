import { NextRequest, NextResponse } from 'next/server';
import { readSession, sameOrigin, sessionCookie } from '@/lib/auth';
import { getStore } from '@/lib/db';
import type { Status } from '@/lib/requests';

export const runtime = 'nodejs';
const statuses: Status[] = ['new', 'processing', 'completed', 'cancelled'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!readSession(request.cookies.get(sessionCookie)?.value)) return NextResponse.json({ error: 'Cần đăng nhập.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 3000) return NextResponse.json({ error: 'Ghi chú quá dài.' }, { status: 413 });
  let data: Record<string, unknown>;
  try { data = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 }); }
  if (!statuses.includes(data.status as Status) || typeof data.internalNote !== 'string' || data.internalNote.length > 2000) return NextResponse.json({ error: 'Trạng thái hoặc ghi chú không hợp lệ.' }, { status: 400 });
  const saved = getStore().updateRequest((await params).id, data.status as Status, data.internalNote.trim());
  return saved ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Không tìm thấy yêu cầu.' }, { status: 404 });
}
