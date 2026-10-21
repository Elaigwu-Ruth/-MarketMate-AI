import type { NextConfig } from 'next';
const config: NextConfig = { distDir: process.env.ORDERDESK_BUILD_DIR || '.next', serverExternalPackages: ['node:sqlite'], poweredByHeader: false };
export default config;
