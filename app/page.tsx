import { redirect } from 'next/navigation';

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ALLOWED_ECOSYSTEM_SOURCES = new Set(['ghctraining', 'ghcnutrition']);

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolved = searchParams ? await searchParams : {};
  const source = firstValue(resolved.utm_source);
  const medium = firstValue(resolved.utm_medium);
  const campaign = firstValue(resolved.utm_campaign);

  if (
    source &&
    ALLOWED_ECOSYSTEM_SOURCES.has(source) &&
    medium === 'ecosystem' &&
    campaign === 'ghc_ecosystem'
  ) {
    const query = new URLSearchParams({
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
    });
    redirect(`/preventa?${query.toString()}`);
  }

  redirect('/preventa');
}
