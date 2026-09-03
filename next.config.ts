import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'ioredis'],
};

export default nextConfig;
