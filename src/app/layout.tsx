import '@/styles/index.scss';

export const metadata = {
  title: 'Gabekross',
  description: 'Family Feud-style in-person game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
