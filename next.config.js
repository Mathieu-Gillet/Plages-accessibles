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
    ],
  },
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
