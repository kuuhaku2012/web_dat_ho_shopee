import './globals.css';

export const metadata = { title: 'Đặt hộ Shopee', description: 'Gửi yêu cầu đặt hộ Shopee và tài khoản mới.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
