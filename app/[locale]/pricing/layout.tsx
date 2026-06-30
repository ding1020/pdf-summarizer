// ISR: revalidate every hour for pricing page (non-dynamic content)
export const revalidate = 3600;

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
