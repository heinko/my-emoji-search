/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['onnxruntime-node'],
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig