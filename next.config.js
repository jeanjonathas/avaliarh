/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', process.env.NEXT_PUBLIC_DOMAIN || 'admitto.com.br'],
  },
  // Configuração para lidar com proxy reverso HTTPS
  poweredByHeader: false,
  // Configuração para headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  // Configuração para lidar com proxy reverso
  async rewrites() {
    return {
      beforeFiles: [
        // Reescreve as requisições para API para garantir que funcionem com o proxy reverso
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
      ],
    }
  },
  // Configuração para redirecionamentos
  async redirects() {
    return [
      // Redirecionar para a página de dashboard após login
      {
        source: '/',
        has: [
          {
            type: 'cookie',
            key: 'next-auth.session-token',
          },
        ],
        destination: '/admin/dashboard',
        permanent: false,
      },
      {
        source: '/',
        has: [
          {
            type: 'cookie',
            key: '__Secure-next-auth.session-token',
          },
        ],
        destination: '/admin/dashboard',
        permanent: false,
      },
    ]
  },
  // Configuração para variáveis de ambiente
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN || 'admitto.com.br',
  },
  // Configuração para webpack
  webpack: (config, { isServer }) => {
    // Configurações adicionais do webpack, se necessário
    return config
  },
}

module.exports = nextConfig
