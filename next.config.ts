import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Short, stable links for the printed QR codes (see /apply/qr). They bounce
  // to the real form pages, so the codes never need reprinting if a page moves.
  async redirects() {
    return [
      { source: "/volunteer", destination: "/apply/volunteer", permanent: false },
      { source: "/homecare", destination: "/apply/homecare", permanent: false },
    ];
  },
};

export default nextConfig;
