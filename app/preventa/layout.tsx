import './refinements.css';
import './hero-refinement-v3.css';
import './conversion-premium.css';

// Build marker: revalidate the final presale conversion bundle after Vercel quota reset.
export default function PreventaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
