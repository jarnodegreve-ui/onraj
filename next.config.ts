import type { NextConfig } from "next";

// Beveiligingsheaders voor alle responses. Geen strikte CSP (zou inline/script
// van Next + grafieken breken); wel de veilige, breed compatibele grendels.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // geen clickjacking via iframe
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
