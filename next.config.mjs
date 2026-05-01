/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Usa el compilador SWC de alta velocidad escrito en Rust
  images: {
    domains: ['images.unsplash.com', 'res.cloudinary.com'], // Seguridad para imágenes externas
  },
};

export default nextConfig;
