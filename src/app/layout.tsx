import '@/styles/index.scss';

export const metadata = {
  title: 'Jemigah Family Games',
  description: 'Premium live family game experiences for parties, events, and game nights.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
