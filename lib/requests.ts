export const vouchers = ['50', '60', '70', '80', '100'] as const;
export type Status = 'new' | 'processing' | 'completed' | 'cancelled';
export type RequestInput = {
  type: 'order' | 'account';
  productUrl: string;
  voucher: string;
  quantity: number;
  name: string;
  phone: string;
  email: string;
  note: string;
};
export type RequestRecord = RequestInput & {
  id: string;
  status: Status;
  internalNote: string;
  createdAt: string;
  updatedAt: string;
};

export class ValidationError extends Error {}

export function parseRequest(input: unknown): RequestInput {
  if (!input || typeof input !== 'object') throw new ValidationError('Dữ liệu không hợp lệ.');
  const value = input as Record<string, unknown>;
  const field = (key: string, max: number) => {
    if (value[key] == null) return '';
    if (typeof value[key] !== 'string') throw new ValidationError(`${key} không hợp lệ.`);
    const result = (value[key] as string).trim();
    if (result.length > max) throw new ValidationError(`${key} quá dài.`);
    return result;
  };
  const type = value.type;
  if (type !== 'order' && type !== 'account') throw new ValidationError('Loại yêu cầu không hợp lệ.');
  const quantity = Number(value.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new ValidationError('Số lượng phải từ 1 đến 20.');
  const name = field('name', 100);
  const phone = field('phone', 30);
  const email = field('email', 254);
  const note = field('note', 1000);
  if (!name) throw new ValidationError('Vui lòng nhập tên.');
  if (!phone && !email) throw new ValidationError('Vui lòng nhập số điện thoại hoặc email.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Email không hợp lệ.');
  if (phone && !/^[+\d][\d\s().-]{5,29}$/.test(phone)) throw new ValidationError('Số điện thoại không hợp lệ.');
  let productUrl = '';
  let voucher = '';
  if (type === 'order') {
    productUrl = field('productUrl', 2000);
    voucher = field('voucher', 3);
    try {
      const url = new URL(productUrl);
      if (url.protocol !== 'https:' || (url.hostname !== 'shopee.vn' && !url.hostname.endsWith('.shopee.vn'))) throw new Error();
    } catch { throw new ValidationError('Vui lòng nhập link sản phẩm Shopee hợp lệ.'); }
    if (!vouchers.includes(voucher as typeof vouchers[number])) throw new ValidationError('Voucher không hợp lệ.');
  }
  return { type, productUrl, voucher, quantity, name, phone, email, note };
}
