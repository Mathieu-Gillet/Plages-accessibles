/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allowlist instead of '**' to mitigate GHSA-9g9p-9gw9-jx7f
    // (DoS via unrestricted Image Optimizer remotePatterns).
    // Add new hosts here when needed (Supabase storage, Wikimedia, Unsplash, ...).
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Picsum: placeholder images (deterministic via seed). To replace with real
      // beach photos as they become available (Wikimedia Commons or municipal sources).
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
