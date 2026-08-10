/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los webhooks corren en Edge Runtime; el resto del stack puede usar Node.
  experimental: {
    // Reduce el tamaño del bundle de los server components.
    optimizePackageImports: ['@supabase/supabase-js', '@anthropic-ai/sdk', 'openai'],
  },
};

export default nextConfig;
