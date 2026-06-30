// ISR: revalidate every hour for help page (non-dynamic content)
export const revalidate = 3600;

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
