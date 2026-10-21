export const privacyNoticeVersion = '2026-10-21';

export type PrivacyRequestType = 'access' | 'correction' | 'deletion' | 'withdrawal';
export type PrivacyRequestStatus = 'new' | 'processing' | 'completed' | 'rejected';
export type PrivacyRequestRecord = {
  id: string;
  userId: string | null;
  requestId: string | null;
  phone: string;
  type: PrivacyRequestType;
  message: string;
  status: PrivacyRequestStatus;
  internalNote: string;
  createdAt: string;
  updatedAt: string;
};

export function requirePrivacyConsent(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as Record<string, unknown>).privacyConsentVersion !== privacyNoticeVersion) {
    throw new Error('Vui lòng đọc và đồng ý với Chính sách quyền riêng tư.');
  }
  return privacyNoticeVersion;
}

export function parsePrivacyRequest(value: unknown): { type: PrivacyRequestType; message: string; requestId: string; phone: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Dữ liệu không hợp lệ.');
  const data = value as Record<string, unknown>;
  if (data.type !== 'access' && data.type !== 'correction' && data.type !== 'deletion' && data.type !== 'withdrawal') throw new Error('Loại yêu cầu quyền dữ liệu không hợp lệ.');
  const message = typeof data.message === 'string' ? data.message.trim() : '';
  const requestId = typeof data.requestId === 'string' ? data.requestId.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  if (message.length > 1000) throw new Error('Nội dung yêu cầu quá dài.');
  if (requestId && !/^[a-f0-9-]{36}$/i.test(requestId)) throw new Error('Mã yêu cầu không hợp lệ.');
  if (phone && !/^[+\d][\d\s().-]{5,29}$/.test(phone)) throw new Error('Số điện thoại không hợp lệ.');
  return { type: data.type, message, requestId, phone };
}
