import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "mongodb", "bcryptjs", "jszip"],
};

export default nextConfig;
