import type { MetadataRoute } from 'next';
import { academyTopics } from '../lib/seo/academy-topics';

export default function sitemap(): MetadataRoute.Sitemap {
  const publishedAt = new Date('2026-10-08T00:00:00+02:00');
  return [
    { url: 'https://ghcacademy.net/preventa', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://ghcacademy.net/recursos', lastModified: publishedAt, changeFrequency: 'monthly', priority: 0.9 },
    ...academyTopics.map(({ slug }) => ({
      url: `https://ghcacademy.net/recursos/${slug}`,
      lastModified: publishedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
