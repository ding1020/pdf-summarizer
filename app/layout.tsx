// Root layout — required by Next.js App Router
// Passes through to [locale]/layout.tsx which has <html> and <body>.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
