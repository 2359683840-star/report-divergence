/** @type {import('next').NextConfig} */
const nextConfig = {
  // 前端通过 NEXT_PUBLIC_API_URL 直接调用后端 API（Vercel 部署时设置）
  // 本地开发在 .env.local 设置 NEXT_PUBLIC_API_URL=http://localhost:8000
};

module.exports = nextConfig;
