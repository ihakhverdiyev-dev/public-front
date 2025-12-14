/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['pdfjs-dist'],
  webpack: (config) => {
    // Handle pdfjs worker esm
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?m?js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/chunks/[name].[contenthash].js',
      },
    })
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/pdfjs-dist/,
      type: 'javascript/auto',
    })
    return config
  },
}

module.exports = nextConfig
