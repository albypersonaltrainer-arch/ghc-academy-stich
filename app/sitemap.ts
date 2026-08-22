import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://ghcacademy.net/preventa',
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
