import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { allowSubmission } from '@/lib/limit';
import { parseRequest, ValidationError } from '@/lib/requests';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!allowSubmission()) return NextResponse.json({ error: 'Hệ thống đang nhận nhiều yêu cầu. Vui lòng thử lại sau một phút.' }, { status: 429 });
  try {
    const raw = await request.text();
    if (raw.length > 5000) return NextResponse.json({ error: 'Dữ liệu quá dài.' }, { status: 413 });
    const input = parseRequest(JSON.parse(raw));
    const saved = getStore().createRequest(input);
    return NextResponse.json({ id: saved.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Không thể lưu yêu cầu. Vui lòng thử lại.' }, { status: 500 });
  }
}
