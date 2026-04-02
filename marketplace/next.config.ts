import type { NextConfig } from "next";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["bcrypt"],
  env: {
    APP_VERSION: pkg.version ?? "0.0.0",
  },
};

export default nextConfig;
