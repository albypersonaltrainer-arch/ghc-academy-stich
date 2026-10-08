import type { Metadata } from 'next';
import BajaClient from './BajaClient';
export const metadata: Metadata = {
  title: 'Baja de comunicaciones | GHC Academy',
  robots: { index: false, follow: false },
};
export default async function BajaPage({ searchParams }: { searchParams: Promise<{token?: string | string[]}> }) {
  const params = await searchParams;
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token || '';
  return <BajaClient token={token} />;
}
