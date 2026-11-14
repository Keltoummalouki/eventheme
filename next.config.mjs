/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les visuels de la maquette sont servis par des CDN externes et utilisent un
  // repli `onError`. On garde donc la balise <img> native (cf. SmartImage) plutôt
  // que next/image, afin de préserver exactement les filtres et transitions CSS.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  // Anciennes adresses (avant le cahier des charges EVENTHEMES) : les liens
  // partagés et les favoris mènent à la page qui les remplace.
  async redirects() {
    return [
      { source: '/location', destination: '/materiel', permanent: true },
      { source: '/location/:id', destination: '/materiel/:id', permanent: true },
      { source: '/evenements', destination: '/realisations', permanent: true },
    ];
  },
};

export default nextConfig;
