/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
      },
      {
        protocol: "https",
        hostname: "**.convex.site",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/register",
        destination: "/signup",
        permanent: false,
      },
      {
        source: "/sign-in",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/signin",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/admin-panel",
        destination: "/admin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
