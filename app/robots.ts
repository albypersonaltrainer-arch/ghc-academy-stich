import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/preventa', '/legal'],
      disallow: [
        '/acceso',
        '/admin',
        '/alumno',
        '/api',
        '/certificados',
        '/cursos',
        '/exam',
        '/ghc-control-center',
        '/login',
        '/matricula',
        '/preventa/checkout',
        '/preventa/confirmacion',
        '/preventa/correos',
        '/stitch-pages',
      ],
    },
    sitemap: 'https://ghcacademy.net/sitemap.xml',
  };
}
