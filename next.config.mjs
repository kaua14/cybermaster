const seguro = process.env.COOKIE_SECURE !== "0";

/** @type {import("next").NextConfig} */
const config = {
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "@huggingface/transformers", "onnxruntime-node", "postgres"],
  async headers() {
    const comuns = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ];
    if (seguro) comuns.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
    return [{ source: "/:path*", headers: comuns }];
  },
};

export default config;
