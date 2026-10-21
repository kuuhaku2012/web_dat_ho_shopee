// Public recipient details from the BIDV QR supplied by the site owner.
const bankBin = '970418';
const accountNumber = '6460530993';
const accountName = 'DINH TAN PHUONG';

export function createPaymentDetails(id: string, amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Invalid payment amount');
  const transferCode = `DATHO${id.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const url = new URL(`https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.svg`);
  url.searchParams.set('amount', String(amount));
  url.searchParams.set('addInfo', transferCode);
  url.searchParams.set('accountName', accountName);
  return { amount, transferCode, qrUrl: url.toString(), bankName: 'BIDV', accountNumber, accountName };
}
