import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aruna Personal',
    short_name: 'Aruna',
    description: 'Organize hoje. Construa o amanhã.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0E1D18',
    theme_color: '#0E1D18',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
