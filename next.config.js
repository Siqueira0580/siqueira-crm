/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Impede que o site seja embutido em iframes de outros domínios (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Impede sniffing de tipo MIME
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Força HTTPS por 1 ano (HSTS)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Controla informações enviadas no Referer
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Limita recursos do navegador disponíveis para a página
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: próprio site + Supabase + Google Identity Services (OAuth Drive)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://accounts.google.com",
      // Estilos: próprio site + inline (necessário para Tailwind/CSS-in-JS)
      "style-src 'self' 'unsafe-inline'",
      // Imagens: próprio site + Supabase storage + Unsplash (fotos da landing page) + data URIs
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
      // Fontes: próprio site
      "font-src 'self' data:",
      // Conexões de rede: próprio site + Supabase + Anthropic + Google APIs (upload Drive)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.anthropic.com https://www.googleapis.com https://accounts.google.com",
      // Frames: apenas mesmo domínio
      "frame-src 'self'",
      // Objetos: bloqueados
      "object-src 'none'",
      // Base URI: apenas mesmo domínio
      "base-uri 'self'",
      // Formulários: apenas mesmo domínio
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Aplica os headers em todas as rotas
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
