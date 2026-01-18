/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Optimizing image configurations for docker
    images: {
        unoptimized: true
    }
};

export default nextConfig;